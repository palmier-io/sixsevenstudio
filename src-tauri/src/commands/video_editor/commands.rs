use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

use crate::commands::video_editor::{
    ffmpeg::{concatenate_fast, concatenate_with_transitions, verify_ffmpeg_available, generate_waveform_image, generate_sprite_image},
    types::{EditorState, TimelineClip},
};

use crate::commands::projects::paths::ProjectPaths;

/// Create a stitched preview video from timeline clips
#[tauri::command]
pub async fn create_preview_video(
    app: AppHandle,
    clips: Vec<TimelineClip>,
    project_name: String,
) -> Result<String, String> {
    verify_ffmpeg_available(Some(&app))?;

    if clips.is_empty() {
        return Err("No clips to preview".to_string());
    }

    let paths = ProjectPaths::from_name(&app, &project_name)?;

    // Create temp directory for intermediate files
    let temp_dir = paths.root().join("temp");
    std::fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;

    // Generate preview filename
    let preview_filename = "preview.mp4";
    let output_path = temp_dir.join(preview_filename);
    let output_path_str = output_path
        .to_str()
        .ok_or("Invalid output path")?
        .to_string();

    // Check if any clips have transitions configured
    let has_transitions = clips.iter().any(|clip| clip.transition_type.is_some());

    // Choose the appropriate concatenation method
    let result = if has_transitions {
        // Use transition-aware concatenation (requires re-encoding)
        concatenate_with_transitions(&app, &clips, &output_path, &temp_dir).await
    } else {
        // Use fast codec copy (no re-encoding)
        concatenate_fast(&app, &clips, &output_path, &temp_dir).await
    };

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
    let paths = ProjectPaths::from_name(&app, &project_name)?;
    let editor_state_file = paths.editor_state_file();

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
    let paths = ProjectPaths::from_name(&app, &project_name)?;
    let editor_state_file = paths.editor_state_file();

    if !editor_state_file.exists() {
        return Ok(None);
    }

    let json = std::fs::read_to_string(&editor_state_file)
        .map_err(|e| format!("Failed to read editor state: {}", e))?;

    let state: EditorState =
        serde_json::from_str(&json).map_err(|e| format!("Failed to parse editor state: {}", e))?;

    Ok(Some(state))
}

/// Export video by copying preview to user-selected location
#[tauri::command]
pub async fn export_video(app: AppHandle, preview_path: String) -> Result<String, String> {
    // Verify preview file exists
    if !std::path::Path::new(&preview_path).exists() {
        return Err("Preview video not found. Please generate a preview first.".to_string());
    }

    // Open save dialog
    let file_path = app
        .dialog()
        .file()
        .add_filter("MP4 Video", &["mp4"])
        .add_filter("All Video Files", &["mp4", "mkv", "mov", "avi"])
        .set_file_name("exported_video.mp4")
        .blocking_save_file();

    let file_path = match file_path {
        Some(path) => path,
        None => return Err("Export cancelled by user".to_string()),
    };

    let output_path = file_path.to_string();

    // Copy preview video to selected location
    std::fs::copy(&preview_path, &output_path)
        .map_err(|e| format!("Failed to export video: {}", e))?;

    Ok(output_path)
}

/// Generate waveform image for a clip
#[tauri::command]
pub async fn generate_clip_waveform(
    app: AppHandle,
    project_name: String,
    clip_id: String,
    width: u32,
    height: u32,
) -> Result<Option<String>, String> {
    verify_ffmpeg_available(Some(&app))?;

    let paths = ProjectPaths::from_name(&app, &project_name)?;
    
    // Ensure cache directories exist
    std::fs::create_dir_all(paths.waveforms_dir())
        .map_err(|e| format!("Failed to create waveforms cache directory: {}", e))?;

    // Check cache first
    let cache_path = paths.waveform_file(&clip_id, width);
    if cache_path.exists() {
        return Ok(cache_path.to_str().map(|s| s.to_string()));
    }

    // Load editor state to get clip information
    let editor_state = load_editor_state(app.clone(), project_name.clone())
        .await
        .map_err(|e| format!("Failed to load editor state: {}", e))?;

    let state = editor_state.ok_or("Editor state not found")?;
    let clip = state.clips.iter()
        .find(|c| c.id == clip_id)
        .ok_or(format!("Clip {} not found", clip_id))?;

    // Generate waveform
    generate_waveform_image(
        &app,
        &clip.video_path,
        clip.trim_start,
        clip.trim_end,
        &cache_path,
        width,
        height,
    ).await.map_err(|e| {
        // If waveform generation fails (e.g., no audio track), return None instead of error
        // This allows the UI to continue working without waveforms
        format!("Waveform generation failed (video may not have audio): {}", e)
    })?;

    Ok(cache_path.to_str().map(|s| s.to_string()))
}

/// Generate sprite image for a clip
#[tauri::command]
pub async fn generate_clip_sprite(
    app: AppHandle,
    project_name: String,
    clip_id: String,
    width: u32,
    height: u32,
) -> Result<Option<String>, String> {
    verify_ffmpeg_available(Some(&app))?;

    let paths = ProjectPaths::from_name(&app, &project_name)?;
    
    // Ensure cache directories exist
    std::fs::create_dir_all(paths.sprites_dir())
        .map_err(|e| format!("Failed to create sprites cache directory: {}", e))?;

    // Check cache first
    let cache_path = paths.sprite_file(&clip_id, width);
    if cache_path.exists() {
        return Ok(cache_path.to_str().map(|s| s.to_string()));
    }

    // Load editor state to get clip information
    let editor_state = load_editor_state(app.clone(), project_name.clone())
        .await
        .map_err(|e| format!("Failed to load editor state: {}", e))?;

    let state = editor_state.ok_or("Editor state not found")?;
    let clip = state.clips.iter()
        .find(|c| c.id == clip_id)
        .ok_or(format!("Clip {} not found", clip_id))?;

    // Generate sprite with width-based frame count
    generate_sprite_image(
        &app,
        &clip.video_path,
        clip.trim_start,
        clip.trim_end,
        &cache_path,
        width,
        height,
    ).await?;

    Ok(cache_path.to_str().map(|s| s.to_string()))
}
