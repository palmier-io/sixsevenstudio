#[tauri::command]
pub async fn resize_image(
    image_path: String,
    target_width: u32,
    target_height: u32,
) -> Result<(), String> {
    // Read and load the image
    let image_bytes = std::fs::read(&image_path)
        .map_err(|e| format!("Failed to read image file: {}", e))?;

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