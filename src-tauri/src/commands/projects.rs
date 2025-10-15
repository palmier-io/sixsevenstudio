use serde::{Deserialize, Serialize};
use std::env;
use std::ffi::OsStr;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

// ============================================================================
// Constants
// ============================================================================

const WORKSPACE_FOLDER: &str = "sixsevenstudio";
const PROJECT_META_DIR: &str = ".sixseven";
const PROJECT_META_FILE: &str = "metadata.json";

// ============================================================================
// Types
// ============================================================================

#[derive(Serialize, Deserialize, Clone)]
pub struct ProjectSummary {
    pub name: String,
    pub path: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ProjectMeta {
    pub videos: Vec<VideoMeta>,
    pub path: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct VideoMeta {
    pub id: String,
    pub prompt: String,
    pub model: String,
    pub resolution: String,
    pub duration: i32,
    pub created_at: i64,
}

// ============================================================================
// Helper Functions
// ============================================================================

fn sanitize_project_name(name: &str) -> Result<String, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Project name cannot be empty".to_string());
    }
    if trimmed.contains('/') || trimmed.contains('\\') || trimmed.contains("..") {
        return Err("Invalid project name".to_string());
    }
    Ok(trimmed.to_string())
}

fn ensure_dir(path: &Path) -> Result<(), String> {
    if !path.exists() {
        fs::create_dir_all(path)
            .map_err(|e| format!("Failed to create directory {}: {}", path.display(), e))?;
    }
    Ok(())
}

fn project_dir(workspace: &Path, name: &str) -> PathBuf {
    workspace.join(name)
}

fn default_workspace_dir() -> PathBuf {
    let home = env::var("HOME")
        .or_else(|_| env::var("USERPROFILE"))
        .ok()
        .map(PathBuf::from)
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));
    home.join(WORKSPACE_FOLDER)
}

fn safe_workspace(_app: &AppHandle) -> Result<PathBuf, String> {
    let default = default_workspace_dir();
    ensure_dir(&default)?;
    Ok(default)
}

fn read_project_meta(project_path: &Path) -> Result<ProjectMeta, String> {
    let meta_path = project_path.join(PROJECT_META_DIR).join(PROJECT_META_FILE);
    if !meta_path.exists() {
        return Ok(ProjectMeta { videos: Vec::new(), path: project_path.to_string_lossy().to_string() });
    }
    let contents =
        fs::read_to_string(&meta_path).map_err(|e| format!("Failed to read metadata: {}", e))?;
    serde_json::from_str(&contents).map_err(|e| format!("Failed to parse metadata: {}", e))
}

fn write_project_meta(project_path: &Path, meta: &ProjectMeta) -> Result<(), String> {
    let meta_dir = project_path.join(PROJECT_META_DIR);
    ensure_dir(&meta_dir)?;
    let meta_path = meta_dir.join(PROJECT_META_FILE);
    let json = serde_json::to_string_pretty(meta)
        .map_err(|e| format!("Failed to serialize metadata: {}", e))?;
    fs::write(&meta_path, json).map_err(|e| format!("Failed to write metadata: {}", e))
}

// ============================================================================
// Tauri Commands
// ============================================================================

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
    let entries = fs::read_dir(&ws).map_err(|e| format!("Failed to read workspace: {}", e))?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_dir() {
            let name = path
                .file_name()
                .and_then(OsStr::to_str)
                .unwrap_or("")
                .to_string();
            if name.is_empty() || name.starts_with('.') {
                continue;
            }
            items.push(ProjectSummary {
                name,
                path: path.to_string_lossy().to_string(),
            });
        }
    }
    items.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(items)
}

#[tauri::command]
pub async fn create_project(app: AppHandle, name: String) -> Result<ProjectSummary, String> {
    let ws = safe_workspace(&app)?;
    let name = sanitize_project_name(&name)?;
    let dir = project_dir(&ws, &name);
    ensure_dir(&dir)?;
    // init metadata
    let meta_dir = dir.join(PROJECT_META_DIR);
    ensure_dir(&meta_dir)?;
    let meta_path = meta_dir.join(PROJECT_META_FILE);
    if !meta_path.exists() {
        let json = serde_json::to_string_pretty(&ProjectMeta { videos: Vec::new(), path: dir.to_string_lossy().to_string() })
            .map_err(|e| e.to_string())?;
        fs::write(&meta_path, json).map_err(|e| e.to_string())?;
    }
    Ok(ProjectSummary {
        name,
        path: dir.to_string_lossy().to_string(),
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

    let meta = ProjectMeta {
        videos: videos_meta,
        path: project_path.to_string_lossy().to_string(),
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
