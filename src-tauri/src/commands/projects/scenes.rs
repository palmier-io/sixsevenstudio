use std::fs;
use std::path::Path;

use super::super::image::get_image_path;
use super::filesystem::{ensure_dir, sanitize_project_name};
use super::paths::ProjectPaths;
use super::types::{SceneDetails, SceneSummary};

fn scene_reference_image_name(scene_id: &str) -> String {
    format!("scene_{}_reference.jpg", scene_id)
}

fn ensure_storyboard_dirs(project_path: &Path) -> Result<(), String> {
    let paths = ProjectPaths::new(project_path);
    ensure_dir(&paths.storyboard_dir())?;
    ensure_dir(&paths.scenes_dir())
}

fn read_scene_index(project_path: &Path) -> Result<Vec<SceneSummary>, String> {
    let paths = ProjectPaths::new(project_path);
    let index_path = paths.scenes_index();
    if !index_path.exists() {
        return Ok(Vec::new());
    }

    let contents = fs::read_to_string(&index_path)
        .map_err(|e| format!("Failed to read scene index: {}", e))?;

    let mut entries: Vec<SceneSummary> = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse scene index: {}", e))?;

    entries.sort_by(|a, b| a.order.cmp(&b.order));
    Ok(entries)
}

fn write_scene_index(project_path: &Path, summaries: &[SceneSummary]) -> Result<(), String> {
    ensure_storyboard_dirs(project_path)?;

    let paths = ProjectPaths::new(project_path);
    let index_path = paths.scenes_index();
    let json = serde_json::to_string_pretty(summaries)
        .map_err(|e| format!("Failed to serialise scene index: {}", e))?;

    fs::write(&index_path, json).map_err(|e| format!("Failed to write scene index: {}", e))
}

fn create_scene_markdown(title: &str, duration: &str, description: &str) -> String {
    format!(
        "# {}\n\nDuration: {}\n\n{}\n",
        title.trim(),
        duration.trim(),
        description.trim_end()
    )
}

fn parse_scene_markdown(content: &str) -> Result<(String, String, String), String> {
    let mut title: Option<String> = None;
    let mut duration: Option<String> = None;
    let mut description_lines: Vec<&str> = Vec::new();
    let mut in_description = false;

    for line in content.lines() {
        let trimmed = line.trim();

        if !in_description {
            if trimmed.is_empty() {
                continue;
            }

            if title.is_none() && trimmed.starts_with('#') {
                let extracted = trimmed.trim_start_matches('#').trim().to_string();
                if extracted.is_empty() {
                    return Err("Scene file missing title".to_string());
                }
                title = Some(extracted);
                continue;
            }

            if trimmed.to_ascii_lowercase().starts_with("duration:") {
                let value = trimmed
                    .splitn(2, ':')
                    .nth(1)
                    .unwrap_or_default()
                    .trim()
                    .to_string();
                if value.is_empty() {
                    return Err("Scene file missing duration".to_string());
                }
                duration = Some(value);
                in_description = true;
                continue;
            }
        } else {
            description_lines.push(line);
        }
    }

    let title = title.ok_or_else(|| "Scene file missing title".to_string())?;
    let duration = duration.ok_or_else(|| "Scene file missing duration".to_string())?;
    let description = description_lines.join("\n").trim().to_string();

    Ok((title, duration, description))
}

fn validate_duration(duration: &str) -> Result<(), String> {
    if ["4s", "8s", "12s"].contains(&duration) {
        Ok(())
    } else {
        Err(format!(
            "Invalid duration '{}': must be 4s, 8s, or 12s",
            duration
        ))
    }
}

fn ensure_summary_for_scene(summaries: &mut Vec<SceneSummary>, details: &SceneDetails) {
    if let Some(entry) = summaries.iter_mut().find(|s| s.id == details.id) {
        entry.title = details.title.clone();
        entry.duration = details.duration.clone();
        entry.has_reference_image = details.has_reference_image;
        entry.order = details.order;
    } else {
        summaries.push(SceneSummary {
            id: details.id.clone(),
            title: details.title.clone(),
            duration: details.duration.clone(),
            has_reference_image: details.has_reference_image,
            order: details.order,
        });
    }
}

fn build_details_from_disk(project_path: &Path, scene_id: &str) -> Result<SceneDetails, String> {
    let paths = ProjectPaths::new(project_path);
    let scene_path = paths.scene_file(scene_id);
    if !scene_path.exists() {
        return Err(format!("Scene '{}' does not exist", scene_id));
    }

    let content =
        fs::read_to_string(&scene_path).map_err(|e| format!("Failed to read scene: {}", e))?;
    let (title, duration, description) = parse_scene_markdown(&content)?;

    validate_duration(&duration)?;

    let image_name = scene_reference_image_name(scene_id);
    let has_reference_image = get_image_path(project_path, &image_name)?.is_some();

    // The order will be looked up by callers via index; default to 0 when missing.
    Ok(SceneDetails {
        id: scene_id.to_string(),
        title,
        duration,
        description,
        has_reference_image,
        order: 0,
    })
}

/// Read the global context
pub fn read_context(project_path: &Path) -> Result<String, String> {
    let paths = ProjectPaths::new(project_path);
    let path = paths.context_file();
    if !path.exists() {
        return Ok(String::new());
    }

    fs::read_to_string(&path).map_err(|e| format!("Failed to read context: {}", e))
}

/// Write the global context
pub fn write_context(project_path: &Path, content: &str) -> Result<(), String> {
    ensure_storyboard_dirs(project_path)?;
    let paths = ProjectPaths::new(project_path);
    let path = paths.context_file();

    fs::write(&path, content).map_err(|e| format!("Failed to write context: {}", e))
}

/// List all scenes using the index
pub fn list_scenes(project_path: &Path) -> Result<Vec<SceneSummary>, String> {
    let mut summaries = read_scene_index(project_path)?;

    // Ensure any on-disk scenes missing from the index are appended at the end.
    let paths = ProjectPaths::new(project_path);
    let scenes_dir = paths.scenes_dir();
    if scenes_dir.exists() {
        for entry in fs::read_dir(&scenes_dir)
            .map_err(|e| format!("Failed to read scenes directory: {}", e))?
        {
            let entry = entry.map_err(|e| e.to_string())?;
            if !entry.path().is_dir() {
                continue;
            }

            let scene_id = entry
                .file_name()
                .into_string()
                .map_err(|_| "Invalid scene directory name".to_string())?;

            if scene_id == paths.scenes_index().file_name().unwrap().to_string_lossy() {
                continue;
            }

            if summaries.iter().any(|s| s.id == scene_id) {
                continue;
            }

            if let Ok(mut details) = build_details_from_disk(project_path, &scene_id) {
                let max_order = summaries.iter().map(|s| s.order).max().unwrap_or(0);
                details.order = max_order + 1;
                ensure_summary_for_scene(&mut summaries, &details);
            }
        }
    }

    summaries.sort_by(|a, b| a.order.cmp(&b.order));
    write_scene_index(project_path, &summaries)?;
    Ok(summaries)
}

/// Read a specific scene with full details
pub fn read_scene(project_path: &Path, scene_id: &str) -> Result<SceneDetails, String> {
    sanitize_project_name(scene_id)?;

    let mut details = build_details_from_disk(project_path, scene_id)?;

    let index = read_scene_index(project_path)?;
    if let Some(entry) = index.iter().find(|s| s.id == scene_id) {
        details.order = entry.order;
        details.has_reference_image = entry.has_reference_image;
    }

    Ok(details)
}

/// Create or update a scene and refresh the index
pub fn write_scene(
    project_path: &Path,
    scene_id: &str,
    title: &str,
    description: &str,
    duration: &str,
    order: Option<i32>,
) -> Result<(), String> {
    sanitize_project_name(scene_id)?;
    validate_duration(duration)?;

    ensure_storyboard_dirs(project_path)?;

    let paths = ProjectPaths::new(project_path);
    let scene_dir = paths.scene_dir(scene_id);
    ensure_dir(&scene_dir)?;

    let markdown = create_scene_markdown(title, duration, description);
    fs::write(paths.scene_file(scene_id), markdown)
        .map_err(|e| format!("Failed to write scene: {}", e))?;

    let image_name = scene_reference_image_name(scene_id);
    let has_reference_image = get_image_path(project_path, &image_name)?.is_some();

    let mut summaries = read_scene_index(project_path)?;
    let assigned_order = order.unwrap_or_else(|| {
        summaries
            .iter()
            .map(|s| s.order)
            .max()
            .map(|max| max + 1)
            .unwrap_or(0)
    });

    let details = SceneDetails {
        id: scene_id.to_string(),
        title: title.to_string(),
        duration: duration.to_string(),
        description: description.to_string(),
        has_reference_image,
        order: assigned_order,
    };

    ensure_summary_for_scene(&mut summaries, &details);
    summaries.sort_by(|a, b| a.order.cmp(&b.order));
    write_scene_index(project_path, &summaries)
}

/// Delete a scene and remove it from the index
pub fn delete_scene(project_path: &Path, scene_id: &str) -> Result<(), String> {
    sanitize_project_name(scene_id)?;

    let paths = ProjectPaths::new(project_path);
    let scene_dir = paths.scene_dir(scene_id);
    if scene_dir.exists() {
        fs::remove_dir_all(&scene_dir).map_err(|e| format!("Failed to delete scene: {}", e))?;
    }

    let mut summaries = read_scene_index(project_path)?;
    summaries.retain(|entry| entry.id != scene_id);
    write_scene_index(project_path, &summaries)
}

/// Persist a new explicit ordering for scenes
pub fn reorder_scenes(project_path: &Path, ordered_ids: &[String]) -> Result<(), String> {
    let mut summaries = read_scene_index(project_path)?;
    if summaries.is_empty() {
        return Ok(());
    }

    let mut seen: Vec<String> = Vec::new();
    let mut order_counter: i32 = 0;

    for scene_id in ordered_ids {
        if seen.contains(scene_id) {
            continue;
        }
        if let Some(entry) = summaries.iter_mut().find(|entry| entry.id == *scene_id) {
            entry.order = order_counter;
            order_counter += 1;
            seen.push(scene_id.clone());
        }
    }

    for entry in summaries.iter_mut() {
        if !seen.contains(&entry.id) {
            entry.order = order_counter;
            order_counter += 1;
        }
    }

    summaries.sort_by(|a, b| a.order.cmp(&b.order));
    write_scene_index(project_path, &summaries)
}
