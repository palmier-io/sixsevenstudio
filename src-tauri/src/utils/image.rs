use base64::{engine::general_purpose, Engine as _};
use std::path::Path;

/// Read an image file and convert it to a base64 data URL
pub fn read_image_as_data_url(image_path: &str) -> Result<String, String> {
    // Read the image file
    let image_bytes =
        std::fs::read(image_path).map_err(|e| format!("Failed to read image file: {}", e))?;

    // Determine MIME type from file extension
    let mime_type = get_image_mime_type(image_path);

    // Encode to base64
    let base64_data = general_purpose::STANDARD.encode(&image_bytes);

    // Return as data URL
    Ok(format!("data:{};base64,{}", mime_type, base64_data))
}

/// Get MIME type from image file extension
pub fn get_image_mime_type(image_path: &str) -> &'static str {
    match Path::new(image_path)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .as_deref()
    {
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        _ => "image/png", // default to PNG
    }
}

pub fn resize_image(
    image_bytes: Vec<u8>,
    target_width: u32,
    target_height: u32,
) -> Result<Vec<u8>, String> {
    // Load image to check/adjust dimensions
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

        // Re-encode the image to bytes
        let mut buffer = std::io::Cursor::new(Vec::new());
        img.write_to(&mut buffer, image::ImageFormat::Png)
            .map_err(|e| format!("Failed to re-encode image: {}", e))?;
        return Ok(buffer.into_inner());
    }

    Ok(image_bytes)
}
