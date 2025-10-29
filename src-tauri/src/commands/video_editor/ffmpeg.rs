use crate::commands::video_editor::types::TimelineClip;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{AppHandle, Manager};

pub fn get_ffmpeg_path(app: Option<&AppHandle>) -> Result<PathBuf, String> {
    // Try Tauri sidecar first (bundled binary)
    if let Some(app_handle) = app {
        if let Ok(sidecar_path) = app_handle
            .path()
            .resolve("ffmpeg", tauri::path::BaseDirectory::Resource)
        {
            if sidecar_path.exists() {
                return Ok(sidecar_path);
            }
        }
    }

    // Fall back to system FFmpeg
    if Command::new("ffmpeg").arg("-version").output().is_ok() {
        return Ok(PathBuf::from("ffmpeg"));
    }

    Err("FFmpeg not found. Please install FFmpeg or ensure it's bundled with the app.".to_string())
}

pub fn trim_video(
    app: Option<&AppHandle>,
    input_path: &str,
    start_time: f64,
    end_time: f64,
    output_path: &str,
) -> Result<(), String> {
    let duration = end_time - start_time;
    let ffmpeg_path = get_ffmpeg_path(app)?;

    let output = Command::new(ffmpeg_path)
        .args([
            "-ss",
            &start_time.to_string(),
            "-i",
            input_path,
            "-t",
            &duration.to_string(),
            "-c",
            "copy", // Copy codec for fast processing
            "-y",   // Overwrite output file
            output_path,
        ])
        .output()
        .map_err(|e| format!("Failed to execute ffmpeg: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "ffmpeg failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    Ok(())
}

/// Concatenate videos using codec copy (no re-encoding)
pub fn concatenate_videos_fast(
    app: Option<&AppHandle>,
    clips: &[TimelineClip],
    output_path: &str,
    temp_dir: &Path,
) -> Result<(), String>
{
    if clips.is_empty() {
        return Err("No clips to concatenate".to_string());
    }

    // Create temporary trimmed clips
    let mut temp_files = Vec::new();
    let mut concat_list = String::new();

    for (i, clip) in clips.iter().enumerate() {
        let temp_file = temp_dir.join(format!("clip_{}.mp4", i));
        let temp_file_str = temp_file.to_str().ok_or("Invalid temp file path")?;

        // Trim the clip using codec copy (fast)
        trim_video(
            app,
            &clip.video_path,
            clip.trim_start,
            clip.trim_end,
            temp_file_str,
        )?;

        temp_files.push(temp_file.clone());
        concat_list.push_str(&format!("file '{}'\n", temp_file_str));
    }

    // Write concat list file
    let concat_file = temp_dir.join("concat_list.txt");
    std::fs::write(&concat_file, concat_list)
        .map_err(|e| format!("Failed to write concat list: {}", e))?;

    // Concatenate using concat demuxer with codec copy (no re-encoding)
    let ffmpeg_path = get_ffmpeg_path(app)?;
    let output = Command::new(ffmpeg_path)
        .args([
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            concat_file.to_str().unwrap(),
            "-c",
            "copy", // Copy codec - no re-encoding!
            "-y",
            output_path,
        ])
        .output()
        .map_err(|e| format!("Failed to execute ffmpeg: {}", e))?;

    // Clean up temp files
    for temp_file in temp_files {
        let _ = std::fs::remove_file(temp_file);
    }
    let _ = std::fs::remove_file(concat_file);

    if !output.status.success() {
        return Err(format!(
            "ffmpeg failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    Ok(())
}

/// Concatenate videos with transitions using xfade filter (requires re-encoding)
pub fn concatenate_videos_with_transitions(
    app: Option<&AppHandle>,
    clips: &[TimelineClip],
    output_path: &str,
    temp_dir: &Path,
) -> Result<(), String>
{
    if clips.is_empty() {
        return Err("No clips to concatenate".to_string());
    }

    if clips.len() == 1 {
        // Single clip, just trim it
        trim_video(
            app,
            &clips[0].video_path,
            clips[0].trim_start,
            clips[0].trim_end,
            output_path,
        )?;
        return Ok(());
    }

    // Create temporary trimmed clips
    let mut temp_files = Vec::new();

    for (i, clip) in clips.iter().enumerate() {
        let temp_file = temp_dir.join(format!("clip_{}.mp4", i));
        let temp_file_str = temp_file.to_str().ok_or("Invalid temp file path")?;

        // Trim the clip (still need to re-encode for xfade compatibility)
        let ffmpeg_path = get_ffmpeg_path(app)?;
        let output = Command::new(&ffmpeg_path)
            .args([
                "-ss",
                &clip.trim_start.to_string(),
                "-i",
                &clip.video_path,
                "-t",
                &(clip.trim_end - clip.trim_start).to_string(),
                "-c:v",
                "libx264",
                "-preset",
                "superfast",
                "-crf",
                "23",
                "-c:a",
                "aac",
                "-b:a",
                "128k",
                "-y",
                temp_file_str,
            ])
            .output()
            .map_err(|e| format!("Failed to execute ffmpeg: {}", e))?;

        if !output.status.success() {
            return Err(format!(
                "ffmpeg failed on clip {}: {}",
                i + 1,
                String::from_utf8_lossy(&output.stderr)
            ));
        }

        temp_files.push(temp_file.clone());
    }

    // Build the filter_complex for xfade transitions
    let mut filter_complex = String::new();
    let mut current_label = String::from("0:v");

    for (i, clip) in clips.iter().enumerate() {
        if i == clips.len() - 1 {
            // Last clip, no transition after it
            break;
        }

        // Get transition settings (default to fade with 1s duration)
        let transition_type = clip
            .transition_type
            .as_ref()
            .map(|s| s.as_str())
            .unwrap_or("fade");
        let transition_duration = clip.transition_duration.unwrap_or(1.0);

        // Calculate offset: when to start the transition
        // Offset is relative to the start of the first input in the xfade pair
        let offset = clip.duration - transition_duration;

        let next_input = format!("{}:v", i + 1);
        let output_label = if i == clips.len() - 2 {
            String::from("out")
        } else {
            format!("v{}", i)
        };

        // Add xfade filter
        if !filter_complex.is_empty() {
            filter_complex.push_str("; ");
        }

        filter_complex.push_str(&format!(
            "[{}][{}]xfade=transition={}:duration={}:offset={}[{}]",
            current_label, next_input, transition_type, transition_duration, offset, output_label
        ));

        current_label = output_label;
    }

    // Build ffmpeg command with all inputs and filter
    let ffmpeg_path = get_ffmpeg_path(app)?;
    let mut cmd = Command::new(&ffmpeg_path);

    // Add all input files
    for temp_file in &temp_files {
        cmd.arg("-i").arg(temp_file);
    }

    // Add filter_complex and output settings
    cmd.args([
        "-filter_complex",
        &filter_complex,
        "-map",
        "[out]",
        "-c:v",
        "libx264",
        "-preset",
        "superfast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-y",
        output_path,
    ]);

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to execute ffmpeg: {}", e))?;

    // Clean up temp files
    for temp_file in temp_files {
        let _ = std::fs::remove_file(temp_file);
    }

    if !output.status.success() {
        return Err(format!(
            "ffmpeg failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    Ok(())
}
