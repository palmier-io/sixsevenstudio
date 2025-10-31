use tauri::AppHandle;
use std::path::Path;
use crate::commands::video_editor::ffmpeg::ffmpeg::run_ffmpeg;

pub async fn generate_waveform_image(
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
    let size = format!("{}x{}", width, height);
    
    // Use showwavespic filter - this will fail silently if no audio track exists
    // The error will be caught by run_ffmpeg
    let filter_complex = format!("[0:a]showwavespic=s={}:colors=0xFFFFFF:scale=lin[v]", size);

    let args = vec![
        "-ss", &trim_start_str,
        "-i", video_path,
        "-t", &duration_str,
        "-filter_complex", &filter_complex,
        "-map", "[v]",
        "-frames:v", "1",
        "-y",
        output_str,
    ];

    run_ffmpeg(app, &args, "generate waveform").await
}

