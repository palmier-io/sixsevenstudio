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

