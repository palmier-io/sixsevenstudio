use crate::commands::video_editor::types::TimelineClip;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{AppHandle, Manager};
use tauri_plugin_shell::ShellExt;

// Encoding constants
const VIDEO_CODEC: &str = "libx264";
const VIDEO_PRESET: &str = "superfast";
const VIDEO_CRF: &str = "23";
const AUDIO_CODEC: &str = "aac";
const AUDIO_BITRATE: &str = "128k";

pub fn get_ffmpeg_path(app: Option<&AppHandle>) -> Result<PathBuf, String> {
    // https://v2.tauri.app/develop/sidecar/
    if let Some(app_handle) = app {        
        if app_handle.shell().sidecar("ffmpeg").is_ok() {
            if let Ok(resource_dir) = app_handle.path().resource_dir() {
                let target_triple = get_target_triple();

                #[cfg(target_os = "windows")]
                let sidecar_path = resource_dir.join(format!("binaries/ffmpeg-{}.exe", target_triple));
                
                #[cfg(not(target_os = "windows"))]
                let sidecar_path = resource_dir.join(format!("binaries/ffmpeg-{}", target_triple));

                if sidecar_path.exists() {
                    return Ok(sidecar_path);
                }
            }
        }
    }
    Err("FFmpeg not found. Please install FFmpeg or ensure it's bundled with the app.".to_string())
}

fn get_target_triple() -> &'static str {
    #[cfg(all(target_os = "macos", target_arch = "x86_64"))]
    return "x86_64-apple-darwin";
    
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    return "aarch64-apple-darwin";

    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    return "x86_64-unknown-linux-gnu";
    
    #[cfg(all(target_os = "linux", target_arch = "aarch64"))]
    return "aarch64-unknown-linux-gnu";
    
    #[cfg(all(target_os = "windows", target_arch = "x86_64"))]
    return "x86_64-pc-windows-msvc";
    
    #[cfg(all(target_os = "windows", target_arch = "aarch64"))]
    return "aarch64-pc-windows-msvc";
    
    #[allow(unreachable_code)]
    "unknown"
}

fn run_ffmpeg_command(cmd: &mut Command, operation: &str) -> Result<(), String> {
    let output = cmd
        .output()
        .map_err(|e| format!("Failed to execute ffmpeg for {}: {}", operation, e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFmpeg {} failed: {}", operation, stderr));
    }

    Ok(())
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

    let mut cmd = Command::new(ffmpeg_path);
    cmd.args([
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
    ]);

    run_ffmpeg_command(&mut cmd, "trim video")
}

/// Trim and re-encode a video clip (needed for filter compatibility)
fn trim_and_reencode_clip(
    app: Option<&AppHandle>,
    clip: &TimelineClip,
    output_path: &str,
) -> Result<(), String> {
    let duration = clip.trim_end - clip.trim_start;
    let ffmpeg_path = get_ffmpeg_path(app)?;

    let mut cmd = Command::new(ffmpeg_path);
    cmd.args([
        "-ss",
        &clip.trim_start.to_string(),
        "-i",
        &clip.video_path,
        "-t",
        &duration.to_string(),
        "-c:v",
        VIDEO_CODEC,
        "-preset",
        VIDEO_PRESET,
        "-crf",
        VIDEO_CRF,
        "-c:a",
        AUDIO_CODEC,
        "-b:a",
        AUDIO_BITRATE,
        "-y",
        output_path,
    ]);

    run_ffmpeg_command(&mut cmd, &format!("trim and encode clip {}", clip.id))
}

/// Concatenate videos using codec copy (no re-encoding)
pub fn concatenate_videos_fast(
    app: Option<&AppHandle>,
    clips: &[TimelineClip],
    output_path: &str,
    temp_dir: &Path,
) -> Result<(), String> {
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
    let mut cmd = Command::new(ffmpeg_path);
    cmd.args([
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
    ]);

    run_ffmpeg_command(&mut cmd, "concatenate videos")?;

    // Clean up temp files (best effort)
    for temp_file in temp_files {
        if let Err(e) = std::fs::remove_file(temp_file) {
            eprintln!("Warning: Failed to remove temp file: {}", e);
        }
    }
    if let Err(e) = std::fs::remove_file(concat_file) {
        eprintln!("Warning: Failed to remove concat list file: {}", e);
    }

    Ok(())
}

/// Concatenate videos with transitions using xfade filter (requires re-encoding)
pub fn concatenate_videos_with_transitions(
    app: Option<&AppHandle>,
    clips: &[TimelineClip],
    output_path: &str,
    temp_dir: &Path,
) -> Result<(), String> {
    if clips.is_empty() {
        return Err("No clips to concatenate".to_string());
    }

    if clips.len() == 1 {
        // Single clip, just trim it
        return trim_video(
            app,
            &clips[0].video_path,
            clips[0].trim_start,
            clips[0].trim_end,
            output_path,
        );
    }

    let ffmpeg_path = get_ffmpeg_path(app)?;

    // Create temporary trimmed and re-encoded clips
    let mut temp_files = Vec::new();
    for (i, clip) in clips.iter().enumerate() {
        let temp_file = temp_dir.join(format!("clip_{}.mp4", i));
        let temp_file_str = temp_file.to_str().ok_or("Invalid temp file path")?;

        trim_and_reencode_clip(app, clip, temp_file_str)?;
        temp_files.push(temp_file);
    }

    // Build filter_complex for video transitions and audio concatenation
    let filter_complex = build_transition_filter_complex(clips);

    // Build and run FFmpeg command
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
        "[out]", // Video output
        "-map",
        "[outa]", // Audio output
        "-c:v",
        VIDEO_CODEC,
        "-preset",
        VIDEO_PRESET,
        "-crf",
        VIDEO_CRF,
        "-c:a",
        AUDIO_CODEC,
        "-b:a",
        AUDIO_BITRATE,
        "-y",
        output_path,
    ]);

    run_ffmpeg_command(&mut cmd, "concatenate videos with transitions")?;

    // Clean up temp files (best effort)
    for temp_file in temp_files {
        if let Err(e) = std::fs::remove_file(temp_file) {
            eprintln!("Warning: Failed to remove temp file: {}", e);
        }
    }

    Ok(())
}

/// Build the filter_complex string for video transitions and audio concatenation
fn build_transition_filter_complex(clips: &[TimelineClip]) -> String {
    let mut filter_parts = Vec::new();
    let mut current_label = String::from("0:v");
    let mut cumulative_offset = 0.0;

    // Build video transition filters (xfade)
    for (i, clip) in clips.iter().enumerate() {
        if i == clips.len() - 1 {
            // Last clip, no transition after it
            break;
        }

        let transition_type = clip
            .transition_type
            .as_ref()
            .map(|s| s.as_str())
            .unwrap_or("fade");
        let transition_duration = clip.transition_duration.unwrap_or(1.0);

        // Calculate offset: cumulative from the start of the timeline
        let offset = if i == 0 {
            clip.duration - transition_duration
        } else {
            cumulative_offset + clip.duration - transition_duration
        };

        cumulative_offset += clip.duration - transition_duration;

        let next_input = format!("{}:v", i + 1);
        let output_label = if i == clips.len() - 2 {
            String::from("out")
        } else {
            format!("v{}", i)
        };

        filter_parts.push(format!(
            "[{}][{}]xfade=transition={}:duration={}:offset={}[{}]",
            current_label, next_input, transition_type, transition_duration, offset, output_label
        ));

        current_label = output_label;
    }

    // Build audio concatenation filter
    let audio_inputs: String = (0..clips.len()).map(|i| format!("[{}:a]", i)).collect();

    filter_parts.push(format!(
        "{}concat=n={}:v=0:a=1[outa]",
        audio_inputs,
        clips.len()
    ));

    filter_parts.join("; ")
}
