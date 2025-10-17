use super::client::OpenAIClient;
use super::types::{VideoJobResponse, VideoRequest};

// ============================================================================
// Video Client Extensions
// ============================================================================

impl OpenAIClient {
    /// Generate a video using the OpenAI API
    pub async fn create_video(
        &self,
        model: String,
        prompt: String,
        size: Option<String>,
        seconds: Option<String>,
    ) -> Result<String, String> {
        let url = format!("{}/videos", self.base_url);
        let request_body = VideoRequest {
            model,
            prompt,
            size,
            seconds,
        };
        let req = self
            .http
            .post(&url)
            .headers(self.headers())
            .json(&request_body);
        let body = self.exec_request(req, "POST", &url).await?;

        let video_response: VideoJobResponse = serde_json::from_str(&body)
            .map_err(|e| format!("Failed to parse video generation response: {}", e))?;

        Ok(video_response.id)
    }

    /// Check the status of a video generation
    pub async fn check_video_status(&self, video_id: String) -> Result<VideoJobResponse, String> {
        let url = format!("{}/videos/{}", self.base_url, video_id);
        let req = self.http.get(&url).headers(self.headers());
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
            .headers(self.headers())
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
}
