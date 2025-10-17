use std::fs;
use tauri::AppHandle;
use tauri_plugin_log::log;

use super::filesystem::{
    current_timestamp, ensure_dir, list_project_directories, project_dir, read_project_meta,
    read_storyboard_data, safe_workspace, sanitize_project_name, write_project_meta,
    write_storyboard_data,
};
use super::types::{
    ProjectMeta, ProjectSummary, StoryboardData, VideoMeta, PROJECT_META_DIR, PROJECT_META_FILE,
    STORYBOARD_FILE,
};

#[tauri::command]
pub async fn get_workspace_dir(app: AppHandle) -> Result<Option<String>, String> {
    let ws = safe_workspace(&app)?;
    Ok(Some(ws.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn ensure_workspace_exists(app: AppHandle) -> Result<(), String> {
    let ws = safe_workspace(&app)?;
    ensure_dir(&ws)
}

#[tauri::command]
pub async fn list_projects(app: AppHandle) -> Result<Vec<ProjectSummary>, String> {
    let ws = safe_workspace(&app)?;
    let mut items: Vec<ProjectSummary> = Vec::new();

    let directories = list_project_directories(&ws)?;

    for (name, path) in directories {
        let meta = read_project_meta(&path).unwrap_or_else(|_| ProjectMeta {
            videos: Vec::new(),
            path: path.to_string_lossy().to_string(),
            created_at: current_timestamp(),
        });

        items.push(ProjectSummary {
            name,
            path: path.to_string_lossy().to_string(),
            created_at: meta.created_at,
        });
    }

    // Sort by created_at descending (newest first)
    items.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(items)
}

#[tauri::command]
pub async fn create_project(app: AppHandle, name: String) -> Result<ProjectSummary, String> {
    let ws = safe_workspace(&app)?;
    let name = sanitize_project_name(&name)?;
    let dir = project_dir(&ws, &name);
    ensure_dir(&dir)?;

    let created_at = current_timestamp();

    // init metadata
    let meta_dir = dir.join(PROJECT_META_DIR);
    ensure_dir(&meta_dir)?;
    let meta_path = meta_dir.join(PROJECT_META_FILE);
    if !meta_path.exists() {
        let json = serde_json::to_string_pretty(&ProjectMeta {
            videos: Vec::new(),
            path: dir.to_string_lossy().to_string(),
            created_at,
        })
        .map_err(|e| e.to_string())?;
        fs::write(&meta_path, json).map_err(|e| e.to_string())?;
    }
    Ok(ProjectSummary {
        name,
        path: dir.to_string_lossy().to_string(),
        created_at,
    })
}

#[tauri::command]
pub async fn delete_project(
    app: AppHandle,
    name: String,
    mode: Option<String>,
) -> Result<(), String> {
    let ws = safe_workspace(&app)?;
    let name = sanitize_project_name(&name)?;
    let dir = project_dir(&ws, &name);

    if !dir.exists() {
        return Ok(());
    }

    match mode.as_deref() {
        Some("delete") => {
            fs::remove_dir_all(&dir).map_err(|e| format!("Failed to delete: {}", e))?
        }
        _ => {
            // move to trash
            trash::delete(&dir).map_err(|e| format!("Failed to move to trash: {}", e))?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn get_project(app: AppHandle, name: String) -> Result<ProjectMeta, String> {
    let ws = safe_workspace(&app)?;
    let name = sanitize_project_name(&name)?;
    let project_path = project_dir(&ws, &name);
    if !project_path.exists() {
        return Err(format!("Project '{}' does not exist", name));
    }

    let meta = read_project_meta(&project_path)?;
    Ok(meta)
}

#[tauri::command]
pub async fn add_videos_to_project(
    app: AppHandle,
    project_name: String,
    videos_meta: Vec<VideoMeta>,
) -> Result<(), String> {
    let ws = safe_workspace(&app)?;
    let project_name = sanitize_project_name(&project_name)?;
    let project_path = project_dir(&ws, &project_name);

    if !project_path.exists() {
        return Err(format!("Project '{}' does not exist", project_name));
    }

    let existing_meta = read_project_meta(&project_path)?;

    let meta = ProjectMeta {
        videos: videos_meta,
        path: project_path.to_string_lossy().to_string(),
        created_at: existing_meta.created_at,
    };
    write_project_meta(&project_path, &meta)?;
    Ok(())
}

#[tauri::command]
pub async fn delete_video_from_project(
    app: AppHandle,
    project_name: String,
    video_id: String,
) -> Result<(), String> {
    let ws = safe_workspace(&app)?;
    let project_name = sanitize_project_name(&project_name)?;
    let project_path = project_dir(&ws, &project_name);

    if !project_path.exists() {
        return Err(format!("Project '{}' does not exist", project_name));
    }

    // Read current metadata
    let mut meta = read_project_meta(&project_path)?;

    // Remove video from metadata
    meta.videos.retain(|v| v.id != video_id);

    // Write updated metadata
    write_project_meta(&project_path, &meta)?;

    // Delete video file
    let video_file_path = project_path.join(format!("{}.mp4", video_id));
    if video_file_path.exists() {
        fs::remove_file(&video_file_path)
            .map_err(|e| format!("Failed to delete video file: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn get_storyboard(
    app: AppHandle,
    project_name: String,
) -> Result<Option<StoryboardData>, String> {
    let ws = safe_workspace(&app)?;
    let project_name = sanitize_project_name(&project_name)?;
    let project_path = project_dir(&ws, &project_name);

    if !project_path.exists() {
        return Err(format!("Project '{}' does not exist", project_name));
    }

    read_storyboard_data(&project_path)
}

#[tauri::command]
pub async fn save_storyboard(
    app: AppHandle,
    project_name: String,
    storyboard_data: StoryboardData,
) -> Result<(), String> {
    log::debug!("TRIGGERED SAVE STORYBOARD");
    let ws = safe_workspace(&app)?;
    let project_name = sanitize_project_name(&project_name)?;
    let project_path = project_dir(&ws, &project_name);

    if !project_path.exists() {
        return Err(format!("Project '{}' does not exist", project_name));
    }

    write_storyboard_data(&project_path, &storyboard_data)
}

#[tauri::command]
pub async fn delete_storyboard(app: AppHandle, project_name: String) -> Result<(), String> {
    let ws = safe_workspace(&app)?;
    let project_name = sanitize_project_name(&project_name)?;
    let project_path = project_dir(&ws, &project_name);

    if !project_path.exists() {
        return Err(format!("Project '{}' does not exist", project_name));
    }

    let storyboard_path = project_path.join(PROJECT_META_DIR).join(STORYBOARD_FILE);
    if storyboard_path.exists() {
        fs::remove_file(&storyboard_path)
            .map_err(|e| format!("Failed to delete storyboard file: {}", e))?;
    }

    Ok(())
}
