use super::client::OpenAIClient;
use super::types::VideoJobResponse;
use crate::utils::image::resize_image;
use reqwest::multipart::{Form, Part};
use std::path::Path;

impl OpenAIClient {
    pub async fn create_video(
        &self,
        model: String,
        prompt: String,
        size: Option<String>,
        seconds: Option<String>,
        input_reference_path: Option<String>,
    ) -> Result<String, String> {
        let url = format!("{}/videos", self.base_url);
        let form = build_form(model, prompt, size, seconds, input_reference_path).await?;
        let req = self
            .http
            .post(&url)
            .headers(self.headers(None))
            .multipart(form);

        let body = self.exec_request(req, "POST", &url).await?;

        let video_response: VideoJobResponse = serde_json::from_str(&body)
            .map_err(|e| format!("Failed to parse video generation response: {}", e))?;

        Ok(video_response.id)
    }

    /// Check the status of a video generation
    pub async fn check_video_status(&self, video_id: String) -> Result<VideoJobResponse, String> {
        let url = format!("{}/videos/{}", self.base_url, video_id);
        let req = self
            .http
            .get(&url)
            .headers(self.headers(Some("application/json")));
        let body = self.exec_request(req, "GET", &url).await?;
        let video_response: VideoJobResponse = serde_json::from_str(&body)
            .map_err(|e| format!("Failed to parse video status response: {}", e))?;

        Ok(video_response)
    }

    /// Download video content from OpenAI API
    pub async fn download_video_content(&self, video_id: &str) -> Result<Vec<u8>, String> {
        let url = format!("{}/videos/{}/content", self.base_url, video_id);

        let response = self
            .http
            .get(&url)
            .headers(self.headers(None))
            .send()
            .await
            .map_err(|e| format!("Failed to download video: {}", e))?;

        if !response.status().is_success() {
            return Err(format!(
                "Failed to download video: HTTP {}",
                response.status()
            ));
        }

        let bytes = response
            .bytes()
            .await
            .map_err(|e| format!("Failed to read video data: {}", e))?;

        Ok(bytes.to_vec())
    }

    /// Remix an existing video with a new prompt
    pub async fn remix_video(
        &self,
        video_id: String,
        remix_prompt: String,
    ) -> Result<String, String> {
        let url = format!("{}/videos/{}/remix", self.base_url, video_id);

        let body = serde_json::json!({
            "prompt": remix_prompt
        });

        let req = self
            .http
            .post(&url)
            .headers(self.headers(Some("application/json")))
            .json(&body);

        let response_body = self.exec_request(req, "POST", &url).await?;

        let video_response: VideoJobResponse = serde_json::from_str(&response_body)
            .map_err(|e| format!("Failed to parse remix video response: {}", e))?;

        Ok(video_response.id)
    }
}

/* Helper functions */

// https://platform.openai.com/docs/guides/video-generation
async fn build_form(
    model: String,
    prompt: String,
    size: Option<String>,
    seconds: Option<String>,
    input_reference_path: Option<String>,
) -> Result<Form, String> {
    let mut form = Form::new().text("model", model).text("prompt", prompt);

    if let Some(ref size_val) = size {
        form = form.text("size", size_val.clone());
    }

    if let Some(seconds_val) = seconds {
        form = form.text("seconds", seconds_val);
    }

    // Add image reference if provided
    if let Some(image_path) = input_reference_path {
        let path = Path::new(&image_path);
        if !path.exists() {
            return Err(format!("Image file not found: {}", image_path));
        }

        // Read the image file
        let mut image_bytes = tokio::fs::read(&image_path)
            .await
            .map_err(|e| format!("Failed to read image file: {}", e))?;

        // Resize/crop image to match video size if needed
        if let Some(ref size_val) = size {
            // Parse the expected dimensions from size (e.g., "1280x720")
            if let Some((width_str, height_str)) = size_val.split_once('x') {
                if let (Ok(target_width), Ok(target_height)) =
                    (width_str.parse::<u32>(), height_str.parse::<u32>())
                {
                    image_bytes = resize_image(image_bytes, target_width, target_height)?;
                }
            }
        }

        // Determine MIME type from file extension
        let mime_type = match path.extension().and_then(|e| e.to_str()) {
            Some("jpg") | Some("jpeg") => "image/jpeg",
            Some("png") => "image/png",
            Some("webp") => "image/webp",
            _ => return Err("Unsupported image format. Use JPEG, PNG, or WebP.".to_string()),
        };

        // Create the part with the file data
        let filename = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("image")
            .to_string();

        let part = Part::bytes(image_bytes)
            .file_name(filename)
            .mime_str(mime_type)
            .map_err(|e| format!("Failed to set MIME type: {}", e))?;

        form = form.part("input_reference", part);
    }

    Ok(form)
}