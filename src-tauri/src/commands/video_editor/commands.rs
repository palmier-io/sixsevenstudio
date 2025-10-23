use tauri::{AppHandle, Emitter};

use crate::commands::video_editor::{
    ffmpeg,
    types::{TimelineClip, ExportProgress, EditorState},
};

use crate::commands::projects::{
    filesystem::get_project_path,
    types::{PROJECT_META_DIR, EDITOR_STATE_FILE},
};

/// Create a stitched preview video from timeline clips
#[tauri::command]
pub async fn create_preview_video(
    app: AppHandle,
    clips: Vec<TimelineClip>,
    project_name: String,
) -> Result<String, String> {

    // Verify FFmpeg is available
    ffmpeg::get_ffmpeg_path(Some(&app))?;

    if clips.is_empty() {
        return Err("No clips to preview".to_string());
    }

    let project_path = get_project_path(&app, &project_name)?;

    // Create temp directory for intermediate files
    let temp_dir = project_path.join("temp");
    std::fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;

    // Generate preview filename
    let preview_filename = "preview.mp4";
    let output_path = temp_dir.join(preview_filename);
    let output_path_str = output_path.to_str()
        .ok_or("Invalid output path")?
        .to_string();

    // Clone app handle for progress tracking
    let app_clone = app.clone();

    // Create preview using fast codec copy (no re-encoding)
    let result = ffmpeg::concatenate_videos_fast(
        Some(&app),
        &clips,
        &output_path_str,
        &temp_dir,
        move |progress, message| {
            let _ = app_clone.emit("video-preview-progress", ExportProgress {
                progress,
                message: message.clone(),
                status: if progress >= 100.0 { "complete" } else { "processing" }.to_string(),
            });
        },
    );

    match result {
        Ok(_) => Ok(output_path_str),
        Err(e) => {
            let _ = std::fs::remove_file(&output_path);
            Err(e)
        }
    }
}

/// Save the video editor state to disk
#[tauri::command]
pub async fn save_editor_state(
    app: AppHandle,
    project_name: String,
    state: EditorState,
) -> Result<(), String> {
    let project_path = get_project_path(&app, &project_name)?;
    let editor_state_file = project_path.join(PROJECT_META_DIR).join(EDITOR_STATE_FILE);

    let json = serde_json::to_string_pretty(&state)
        .map_err(|e| format!("Failed to serialize editor state: {}", e))?;

    std::fs::write(&editor_state_file, json)
        .map_err(|e| format!("Failed to write editor state: {}", e))?;

    Ok(())
}

/// Load the video editor state from disk
#[tauri::command]
pub async fn load_editor_state(
    app: AppHandle,
    project_name: String,
) -> Result<Option<EditorState>, String> {
    let project_path = get_project_path(&app, &project_name)?;
    let editor_state_file = project_path.join(PROJECT_META_DIR).join(EDITOR_STATE_FILE);

    if !editor_state_file.exists() {
        return Ok(None);
    }

    let json = std::fs::read_to_string(&editor_state_file)
        .map_err(|e| format!("Failed to read editor state: {}", e))?;

    let state: EditorState = serde_json::from_str(&json)
        .map_err(|e| format!("Failed to parse editor state: {}", e))?;

    Ok(Some(state))
}
