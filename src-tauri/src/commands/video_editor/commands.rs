use std::fs;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use uuid::Uuid;

use crate::commands::video_editor::{
    ffmpeg::{concatenate_fast, concatenate_with_transitions, verify_ffmpeg_available, generate_waveform_image, generate_sprite_image, get_video_duration},
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

/// Import a video file into the project
#[tauri::command]
pub async fn import_video(
    app: AppHandle,
    project_name: String,
    file_path: Option<String>,
) -> Result<serde_json::Value, String> {
    verify_ffmpeg_available(Some(&app))?;

    // Open file dialog if no file path provided
    let source_path: std::path::PathBuf = if let Some(path) = file_path {
        std::path::PathBuf::from(path)
    } else {
        let file_path = app
            .dialog()
            .file()
            .add_filter("Video Files", &["mp4", "mkv", "mov", "avi", "webm"])
            .add_filter("MP4 Video", &["mp4"])
            .add_filter("All Files", &["*"])
            .blocking_pick_file();

        match file_path {
            Some(path) => std::path::PathBuf::from(path.to_string()),
            None => return Err("File selection cancelled".to_string()),
        }
    };

    // Get video duration using FFprobe
    let duration = get_video_duration(&app, source_path.to_str().unwrap_or("")).await?;

    let paths = ProjectPaths::from_name(&app, &project_name)?;
    
    // Ensure videos directory exists
    std::fs::create_dir_all(paths.videos_dir())
        .map_err(|e| format!("Failed to create videos directory: {}", e))?;

    // Generate unique ID for the imported video
    let video_id = format!("imported_{}", Uuid::new_v4().to_string().replace("-", ""));
    let dest_path = paths.video_file(&video_id);

    // Copy file to project videos directory
    fs::copy(&source_path, &dest_path)
        .map_err(|e| format!("Failed to copy video file: {}", e))?;

    // Get original filename for display name
    let original_name = source_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Imported Video")
        .to_string();

    // Remove extension from name
    let display_name = original_name
        .rsplit('.')
        .nth(1)
        .unwrap_or(&original_name)
        .to_string();

    // Return metadata
    let metadata = serde_json::json!({
        "id": video_id,
        "name": display_name,
        "videoPath": dest_path.to_str().unwrap_or(""),
        "originalDuration": duration,
        "createdAt": std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64,
    });

    Ok(metadata)
}

/// List all imported videos for a project
#[tauri::command]
pub async fn list_imported_videos(
    app: AppHandle,
    project_name: String,
) -> Result<Vec<serde_json::Value>, String> {
    verify_ffmpeg_available(Some(&app))?;

    let paths = ProjectPaths::from_name(&app, &project_name)?;
    let videos_dir = paths.videos_dir();

    if !videos_dir.exists() {
        return Ok(Vec::new());
    }

    let mut imported_videos = Vec::new();

    // Read directory entries
    let entries = std::fs::read_dir(&videos_dir)
        .map_err(|e| format!("Failed to read videos directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();

        // Only process files (not directories)
        if !path.is_file() {
            continue;
        }

        // Check if filename starts with "imported_"
        let file_name = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("");

        if !file_name.starts_with("imported_") {
            continue;
        }

        // Extract video ID (remove .mp4 extension if present)
        let video_id = if file_name.ends_with(".mp4") {
            &file_name[..file_name.len() - 4]
        } else {
            file_name
        }.to_string();

        // Get video duration using FFprobe
        let duration = match get_video_duration(&app, path.to_str().unwrap_or("")).await {
            Ok(d) => d,
            Err(e) => {
                eprintln!("Failed to get duration for {}: {}", file_name, e);
                continue; // Skip videos we can't read
            }
        };

        // Get file metadata
        let metadata = std::fs::metadata(&path)
            .map_err(|e| format!("Failed to read file metadata: {}", e))?;
        
        let created_at = metadata
            .created()
            .or_else(|_| metadata.modified())
            .map_err(|e| format!("Failed to get file timestamp: {}", e))?
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;

        // Extract display name from filename (remove "imported_" prefix and extension)
        // Since we don't store the original filename, use a default name with UUID suffix for uniqueness
        let display_name = if video_id.starts_with("imported_") {
            let uuid_part = video_id.strip_prefix("imported_").unwrap_or("");
            if uuid_part.len() >= 8 {
                format!("Imported Video ({})", &uuid_part[..8])
            } else {
                format!("Imported Video")
            }
        } else {
            video_id.clone()
        };

        imported_videos.push(serde_json::json!({
            "id": video_id,
            "name": display_name,
            "videoPath": path.to_str().unwrap_or(""),
            "originalDuration": duration,
            "createdAt": created_at,
        }));
    }

    // Sort by creation time (newest first)
    imported_videos.sort_by(|a, b| {
        let a_time = a.get("createdAt").and_then(|v| v.as_i64()).unwrap_or(0);
        let b_time = b.get("createdAt").and_then(|v| v.as_i64()).unwrap_or(0);
        b_time.cmp(&a_time)
    });

    Ok(imported_videos)
}

/// Delete an imported video file from the project
#[tauri::command]
pub async fn delete_imported_video(
    app: AppHandle,
    project_name: String,
    video_id: String,
) -> Result<(), String> {
    if !video_id.starts_with("imported_") {
        return Err("Can only delete imported videos".to_string());
    }

    let paths = ProjectPaths::from_name(&app, &project_name)?;
    let video_path = paths.video_file(&video_id);

    if video_path.exists() {
        std::fs::remove_file(&video_path)
            .map_err(|e| format!("Failed to delete imported video: {}", e))?;
    } else {
        return Err("Video not found".to_string());
    }

    Ok(())
}
