use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

/// Verify that FFmpeg sidecar is available
pub fn verify_ffmpeg_available(app: Option<&AppHandle>) -> Result<(), String> {
    let app = app.ok_or("AppHandle not available")?;
    app.shell()
        .sidecar("ffmpeg")
        .map_err(|_| "FFmpeg sidecar not found. Please ensure it's bundled with the app.".to_string())?;
    Ok(())
}

/// Execute an FFmpeg command via sidecar
pub async fn run_ffmpeg(app: &AppHandle, args: &[&str], op: &str) -> Result<(), String> {
    let output = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| format!("Failed to get ffmpeg sidecar: {}", e))?
        .args(args)
        .output()
        .await
        .map_err(|e| format!("Failed to execute ffmpeg for {}: {}", op, e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("FFmpeg {} failed: {}", op, stderr))
    } else {
        Ok(())
    }
}

/// Get video duration using FFprobe
pub async fn get_video_duration(app: &AppHandle, video_path: &str) -> Result<f64, String> {
    let output = app
        .shell()
        .sidecar("ffprobe")
        .map_err(|e| format!("Failed to get ffprobe sidecar: {}", e))?
        .args(&[
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            video_path,
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to execute ffprobe: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFprobe failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse ffprobe JSON output: {}", e))?;

    let duration_str = json
        .get("format")
        .and_then(|f| f.get("duration"))
        .and_then(|d| d.as_str())
        .ok_or("Duration not found in ffprobe output")?;

    let duration: f64 = duration_str
        .parse()
        .map_err(|e| format!("Failed to parse duration '{}': {}", duration_str, e))?;

    Ok(duration)
}

