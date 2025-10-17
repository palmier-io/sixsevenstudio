use std::env;
use std::ffi::OsStr;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;

use super::types::{
    ProjectMeta, StoryboardData, PROJECT_META_DIR, PROJECT_META_FILE, STORYBOARD_FILE,
    WORKSPACE_FOLDER,
};

pub fn sanitize_project_name(name: &str) -> Result<String, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Project name cannot be empty".to_string());
    }
    if trimmed.contains('/') || trimmed.contains('\\') || trimmed.contains("..") {
        return Err("Invalid project name".to_string());
    }
    Ok(trimmed.to_string())
}

pub fn ensure_dir(path: &Path) -> Result<(), String> {
    if !path.exists() {
        fs::create_dir_all(path)
            .map_err(|e| format!("Failed to create directory {}: {}", path.display(), e))?;
    }
    Ok(())
}

pub fn project_dir(workspace: &Path, name: &str) -> PathBuf {
    workspace.join(name)
}

pub fn default_workspace_dir() -> PathBuf {
    let home = env::var("HOME")
        .or_else(|_| env::var("USERPROFILE"))
        .ok()
        .map(PathBuf::from)
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));
    home.join(WORKSPACE_FOLDER)
}

pub fn safe_workspace(_app: &AppHandle) -> Result<PathBuf, String> {
    let default = default_workspace_dir();
    ensure_dir(&default)?;
    Ok(default)
}

pub fn current_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

pub fn read_project_meta(project_path: &Path) -> Result<ProjectMeta, String> {
    let meta_path = project_path.join(PROJECT_META_DIR).join(PROJECT_META_FILE);
    if !meta_path.exists() {
        return Ok(ProjectMeta {
            videos: Vec::new(),
            path: project_path.to_string_lossy().to_string(),
            created_at: current_timestamp(),
            storyboard_response_id: None,
        });
    }
    let contents =
        fs::read_to_string(&meta_path).map_err(|e| format!("Failed to read metadata: {}", e))?;
    serde_json::from_str(&contents).map_err(|e| format!("Failed to parse metadata: {}", e))
}

pub fn write_project_meta(project_path: &Path, meta: &ProjectMeta) -> Result<(), String> {
    let meta_dir = project_path.join(PROJECT_META_DIR);
    ensure_dir(&meta_dir)?;
    let meta_path = meta_dir.join(PROJECT_META_FILE);
    let json = serde_json::to_string_pretty(meta)
        .map_err(|e| format!("Failed to serialize metadata: {}", e))?;
    fs::write(&meta_path, json).map_err(|e| format!("Failed to write metadata: {}", e))
}

pub fn read_storyboard_data(project_path: &Path) -> Result<Option<StoryboardData>, String> {
    let storyboard_path = project_path.join(PROJECT_META_DIR).join(STORYBOARD_FILE);
    if !storyboard_path.exists() {
        return Ok(None);
    }
    let contents = fs::read_to_string(&storyboard_path)
        .map_err(|e| format!("Failed to read storyboard: {}", e))?;
    let data = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse storyboard: {}", e))?;
    Ok(Some(data))
}

pub fn write_storyboard_data(project_path: &Path, data: &StoryboardData) -> Result<(), String> {
    let meta_dir = project_path.join(PROJECT_META_DIR);
    ensure_dir(&meta_dir)?;
    let storyboard_path = meta_dir.join(STORYBOARD_FILE);
    let json = serde_json::to_string_pretty(data)
        .map_err(|e| format!("Failed to serialize storyboard: {}", e))?;
    fs::write(&storyboard_path, json).map_err(|e| format!("Failed to write storyboard: {}", e))
}

pub fn list_project_directories(workspace: &Path) -> Result<Vec<(String, PathBuf)>, String> {
    let mut items: Vec<(String, PathBuf)> = Vec::new();
    let entries =
        fs::read_dir(workspace).map_err(|e| format!("Failed to read workspace: {}", e))?;

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
            items.push((name, path));
        }
    }

    Ok(items)
}

pub fn get_project_path(app: &AppHandle, project_name: &str) -> Result<PathBuf, String> {
    let ws = safe_workspace(app)?;
    let name = sanitize_project_name(project_name)?;
    let project_path = project_dir(&ws, &name);

    if !project_path.exists() {
        return Err(format!("Project '{}' does not exist", project_name));
    }

    Ok(project_path)
}
