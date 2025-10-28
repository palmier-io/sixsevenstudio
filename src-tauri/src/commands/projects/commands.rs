use std::fs;
use std::path::Path;
use tauri::AppHandle;

use super::filesystem::{
    current_timestamp, ensure_dir, list_project_directories, read_project_meta,
    sanitize_project_name, write_project_meta,
};
use super::paths::ProjectPaths;
use super::scenes;
use super::types::{ProjectMeta, ProjectSummary, SceneDetails, SceneSummary, VideoMeta};

#[tauri::command]
pub async fn get_workspace_dir(app: AppHandle) -> Result<Option<String>, String> {
    let ws = ProjectPaths::workspace(&app)?;
    Ok(Some(ws.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn ensure_workspace_exists(app: AppHandle) -> Result<(), String> {
    let ws = ProjectPaths::workspace(&app)?;
    ensure_dir(&ws)
}

#[tauri::command]
pub async fn list_projects(app: AppHandle) -> Result<Vec<ProjectSummary>, String> {
    let ws = ProjectPaths::workspace(&app)?;
    let mut items: Vec<ProjectSummary> = Vec::new();

    let directories = list_project_directories(&ws)?;

    for (name, path) in directories {
        let meta = read_project_meta(&path).unwrap_or_else(|_| ProjectMeta {
            videos: Vec::new(),
            path: path.to_string_lossy().to_string(),
            created_at: current_timestamp(),
            storyboard_response_id: None,
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
    let paths = ProjectPaths::from_name_create_if_not_exists(&app, &name)?;

    let created_at = current_timestamp();

    // init metadata
    ensure_dir(&paths.metadata_dir())?;
    let meta_path = paths.metadata_file();
    if !meta_path.exists() {
        let json = serde_json::to_string_pretty(&ProjectMeta {
            videos: Vec::new(),
            path: paths.root().to_string_lossy().to_string(),
            created_at,
            storyboard_response_id: None,
        })
        .map_err(|e| e.to_string())?;
        fs::write(&meta_path, json).map_err(|e| e.to_string())?;
    }
    Ok(ProjectSummary {
        name: sanitize_project_name(&name)?,
        path: paths.root().to_string_lossy().to_string(),
        created_at,
    })
}

#[tauri::command]
pub async fn delete_project(
    app: AppHandle,
    name: String,
    mode: Option<String>,
) -> Result<(), String> {
    let paths = ProjectPaths::from_name(&app, &name)?;
    let dir = paths.root();

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
    let paths = ProjectPaths::from_name(&app, &name)?;
    let meta = read_project_meta(paths.root())?;
    Ok(meta)
}

#[tauri::command]
pub async fn add_videos_to_project(
    app: AppHandle,
    project_name: String,
    videos_meta: Vec<VideoMeta>,
) -> Result<(), String> {
    let paths = ProjectPaths::from_name(&app, &project_name)?;
    let existing_meta = read_project_meta(paths.root())?;

    let mut all_videos = existing_meta.videos;
    all_videos.extend(videos_meta);

    let meta = ProjectMeta {
        videos: all_videos,
        path: paths.root().to_string_lossy().to_string(),
        created_at: existing_meta.created_at,
        storyboard_response_id: existing_meta.storyboard_response_id,
    };
    write_project_meta(paths.root(), &meta)?;
    Ok(())
}

#[tauri::command]
pub async fn delete_video_from_project(
    app: AppHandle,
    project_name: String,
    video_id: String,
) -> Result<(), String> {
    let paths = ProjectPaths::from_name(&app, &project_name)?;
    let mut meta = read_project_meta(paths.root())?;

    // Remove video from metadata
    meta.videos.retain(|v| v.id != video_id);

    write_project_meta(paths.root(), &meta)?;

    // Delete video file from videos folder
    let video_file_path = paths.video_file(&format!("{}.mp4", video_id));
    if video_file_path.exists() {
        fs::remove_file(&video_file_path)
            .map_err(|e| format!("Failed to delete video file: {}", e))?;
    }

    Ok(())
}

// Scene-based storyboard commands

#[tauri::command]
pub async fn read_context(app: AppHandle, project_name: String) -> Result<String, String> {
    let paths = ProjectPaths::from_name(&app, &project_name)?;
    scenes::read_context(paths.root())
}

#[tauri::command]
pub async fn write_context(
    app: AppHandle,
    project_name: String,
    content: String,
) -> Result<(), String> {
    let paths = ProjectPaths::from_name(&app, &project_name)?;
    scenes::write_context(paths.root(), &content)
}

#[tauri::command]
pub async fn list_scenes(
    app: AppHandle,
    project_name: String,
) -> Result<Vec<SceneSummary>, String> {
    let paths = ProjectPaths::from_name(&app, &project_name)?;
    scenes::list_scenes(paths.root())
}

#[tauri::command]
pub async fn read_scene(
    app: AppHandle,
    project_name: String,
    scene_id: String,
) -> Result<SceneDetails, String> {
    let paths = ProjectPaths::from_name(&app, &project_name)?;
    scenes::read_scene(paths.root(), &scene_id)
}

#[tauri::command]
pub async fn write_scene(
    app: AppHandle,
    project_name: String,
    scene_id: String,
    title: String,
    description: String,
    duration: String,
    order: Option<i32>,
) -> Result<(), String> {
    let paths = ProjectPaths::from_name(&app, &project_name)?;
    scenes::write_scene(
        paths.root(),
        &scene_id,
        &title,
        &description,
        &duration,
        order,
    )
}

#[tauri::command]
pub async fn delete_scene(
    app: AppHandle,
    project_name: String,
    scene_id: String,
) -> Result<(), String> {
    let paths = ProjectPaths::from_name(&app, &project_name)?;
    scenes::delete_scene(paths.root(), &scene_id)
}

#[tauri::command]
pub async fn reorder_scenes(
    app: AppHandle,
    project_name: String,
    ordered_ids: Vec<String>,
) -> Result<(), String> {
    let paths = ProjectPaths::from_name(&app, &project_name)?;
    scenes::reorder_scenes(paths.root(), &ordered_ids)
}

#[tauri::command]
pub async fn ensure_dir_exists(app: AppHandle, path: String) -> Result<(), String> {
    ensure_dir(&Path::new(&path))
}
