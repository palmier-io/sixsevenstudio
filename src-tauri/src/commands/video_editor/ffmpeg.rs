use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{AppHandle, Manager};
use crate::commands::video_editor::types::TimelineClip;

pub fn get_ffmpeg_path(app: Option<&AppHandle>) -> Result<PathBuf, String> {
    // Try Tauri sidecar first (bundled binary)
    if let Some(app_handle) = app {
        if let Ok(sidecar_path) = app_handle.path().resolve("ffmpeg", tauri::path::BaseDirectory::Resource) {
            if sidecar_path.exists() {
                return Ok(sidecar_path);
            }
        }
    }

    // Fall back to system FFmpeg
    if Command::new("ffmpeg")
        .arg("-version")
        .output()
        .is_ok() {
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
            "-ss", &start_time.to_string(),
            "-i", input_path,
            "-t", &duration.to_string(),
            "-c", "copy", // Copy codec for fast processing
            "-y", // Overwrite output file
            output_path,
        ])
        .output()
        .map_err(|e| format!("Failed to execute ffmpeg: {}", e))?;

    if !output.status.success() {
        return Err(format!("ffmpeg failed: {}", String::from_utf8_lossy(&output.stderr)));
    }

    Ok(())
}

/// Concatenate videos using codec copy (no re-encoding)
pub fn concatenate_videos_fast<F>(
    app: Option<&AppHandle>,
    clips: &[TimelineClip],
    output_path: &str,
    temp_dir: &Path,
    mut progress_callback: F,
) -> Result<(), String>
where
    F: FnMut(f64, String),
{
    progress_callback(0.0, "Starting fast preview...".to_string());

    if clips.is_empty() {
        return Err("No clips to concatenate".to_string());
    }

    // Create temporary trimmed clips
    let mut temp_files = Vec::new();
    let mut concat_list = String::new();
    let clip_count = clips.len() as f64;

    for (i, clip) in clips.iter().enumerate() {
        let progress = (i as f64 / clip_count) * 80.0; // First 80% for trimming
        progress_callback(progress, format!("Processing clip {} of {}...", i + 1, clips.len()));

        let temp_file = temp_dir.join(format!("clip_{}.mp4", i));
        let temp_file_str = temp_file.to_str()
            .ok_or("Invalid temp file path")?;

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

    progress_callback(80.0, "Concatenating clips...".to_string());

    // Write concat list file
    let concat_file = temp_dir.join("concat_list.txt");
    std::fs::write(&concat_file, concat_list)
        .map_err(|e| format!("Failed to write concat list: {}", e))?;

    // Concatenate using concat demuxer with codec copy (no re-encoding)
    let ffmpeg_path = get_ffmpeg_path(app)?;
    let output = Command::new(ffmpeg_path)
        .args([
            "-f", "concat",
            "-safe", "0",
            "-i", concat_file.to_str().unwrap(),
            "-c", "copy", // Copy codec - no re-encoding!
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
        return Err(format!("ffmpeg failed: {}", String::from_utf8_lossy(&output.stderr)));
    }

    progress_callback(100.0, "Preview ready!".to_string());
    Ok(())
}
