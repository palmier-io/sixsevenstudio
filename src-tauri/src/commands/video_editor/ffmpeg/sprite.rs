use tauri::AppHandle;
use std::path::Path;
use crate::commands::video_editor::ffmpeg::ffmpeg::run_ffmpeg;

pub async fn generate_sprite_image(
    app: &AppHandle,
    video_path: &str,
    trim_start: f64,
    trim_end: f64,
    output_path: &Path,
    width: u32,
    height: u32,
) -> Result<(), String> {
    let duration = trim_end - trim_start;
    
    if duration <= 0.0 {
        return Err("Invalid duration: trim_end must be greater than trim_start".to_string());
    }

    let output_str = output_path.to_str()
        .ok_or("Invalid output path")?;

    let trim_start_str = trim_start.to_string();
    let duration_str = duration.to_string();
    
    // Calculate fps based on width to ensure frames are readable
    let min_frame_width = 50;
    let max_frames = (width / min_frame_width).max(1);
    
    // Calculate fps to get approximately max_frames frames
    let fps = (max_frames as f64 / duration).max(0.5).min(10.0); // Between 0.5 and 10 fps
    let num_frames = ((duration * fps).ceil() as u32).max(1);
    
    // Calculate actual frame width to fill the sprite width
    let frame_width = width / num_frames.max(1);
    
    // Extract frames at calculated fps, scale to height, tile horizontally
    let filter_complex = format!(
        "[0:v]fps={},scale=-1:{},scale={}:{},tile={}x1[sprite]",
        fps, height, frame_width, height, num_frames
    );

    let args = vec![
        "-ss", &trim_start_str,
        "-i", video_path,
        "-t", &duration_str,
        "-filter_complex", &filter_complex,
        "-map", "[sprite]",
        "-frames:v", "1",
        "-y",
        output_str,
    ];

    run_ffmpeg(app, &args, "generate sprite").await
}

