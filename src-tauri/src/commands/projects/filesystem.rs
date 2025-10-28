use std::ffi::OsStr;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use super::paths::ProjectPaths;
use super::types::ProjectMeta;

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

pub fn current_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

pub fn read_project_meta(project_path: &Path) -> Result<ProjectMeta, String> {
    let paths = ProjectPaths::new(project_path);
    let meta_path = paths.metadata_file();
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
    let paths = ProjectPaths::new(project_path);
    let meta_dir = paths.metadata_file();
    ensure_dir(&meta_dir)?;
    let json = serde_json::to_string_pretty(meta)
        .map_err(|e| format!("Failed to serialize metadata: {}", e))?;
    fs::write(&paths.metadata_file(), json).map_err(|e| format!("Failed to write metadata: {}", e))
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
