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
