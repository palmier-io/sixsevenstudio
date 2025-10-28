use std::fs;
use std::path::Path;
use tauri::AppHandle;

use super::projects::filesystem::ensure_dir;
use super::projects::paths::ProjectPaths;

pub fn get_image_path(project_path: &Path, image_name: &str) -> Result<Option<String>, String> {
    let paths = ProjectPaths::new(project_path);
    let image_path = paths.image_file(image_name);
    if image_path.exists() {
        Ok(Some(image_path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn save_image(
    app: AppHandle,
    project_name: String,
    image_name: String,
    image_data: String,
) -> Result<String, String> {
    let paths = ProjectPaths::from_name(&app, &project_name)?;

    // Decode base64 image data
    let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &image_data)
        .map_err(|e| format!("Failed to decode base64 image: {}", e))?;

    // Save image to disk
    let images_dir = paths.images_dir();
    ensure_dir(&images_dir)?;
    let image_path = paths.image_file(&image_name);
    fs::write(&image_path, bytes).map_err(|e| format!("Failed to write image: {}", e))?;

    Ok(image_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_image(
    app: AppHandle,
    project_name: String,
    image_name: String,
) -> Result<Option<String>, String> {
    let paths = ProjectPaths::from_name(&app, &project_name)?;
    get_image_path(paths.root(), &image_name)
}

#[tauri::command]
pub async fn delete_image(
    app: AppHandle,
    project_name: String,
    image_name: String,
) -> Result<(), String> {
    let paths = ProjectPaths::from_name(&app, &project_name)?;

    // Delete image file
    let image_path = paths.image_file(&image_name);
    if image_path.exists() {
        fs::remove_file(&image_path).map_err(|e| format!("Failed to delete image: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn resize_image(
    image_path: String,
    target_width: u32,
    target_height: u32,
) -> Result<(), String> {
    // Read and load the image
    let image_bytes =
        std::fs::read(&image_path).map_err(|e| format!("Failed to read image file: {}", e))?;

    let mut img = image::load_from_memory(&image_bytes)
        .map_err(|e| format!("Failed to load image: {}", e))?;

    let (current_width, current_height) = (img.width(), img.height());

    // Only resize if dimensions don't match
    if current_width != target_width || current_height != target_height {
        // Use Fill resize - this will crop to fit the aspect ratio
        img = img.resize_to_fill(
            target_width,
            target_height,
            image::imageops::FilterType::Lanczos3,
        );

        // Re-encode the image to bytes as PNG
        let mut buffer = std::io::Cursor::new(Vec::new());
        img.write_to(&mut buffer, image::ImageFormat::Png)
            .map_err(|e| format!("Failed to re-encode image: {}", e))?;

        // Overwrite the original file with resized version
        std::fs::write(&image_path, buffer.into_inner())
            .map_err(|e| format!("Failed to write resized image: {}", e))?;
    }

    Ok(())
}
