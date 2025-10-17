use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};

use super::types::{OpenAIVideoJobResponse, OpenAIVideoRequest};

#[derive(Clone)]
pub struct OpenAIClient {
    http: reqwest::Client,
    api_key: String,
    base_url: String,
}

impl OpenAIClient {
    pub fn new(api_key: String) -> Self {
        Self {
            http: reqwest::Client::new(),
            api_key,
            base_url: "https://api.openai.com/v1".to_string(),
        }
    }

    fn headers(&self) -> HeaderMap {
        let mut headers = HeaderMap::new();

        if let Ok(auth_value) = HeaderValue::from_str(&format!("Bearer {}", self.api_key)) {
            headers.insert(AUTHORIZATION, auth_value);
        }

        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

        headers
    }

    /// Execute an HTTP request and return the response body or error
    async fn exec_request(
        &self,
        req: reqwest::RequestBuilder,
        method: &str,
        url: &str,
    ) -> Result<String, String> {
        let response = req
            .send()
            .await
            .map_err(|e| format!("Failed to send {} request to {}: {}", method, url, e))?;

        let status = response.status();

        if !status.is_success() {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(format!(
                "{} {} failed with status {}: {}",
                method, url, status, error_text
            ));
        }

        response
            .text()
            .await
            .map_err(|e| format!("Failed to read response body: {}", e))
    }

    /// Generate a video using the OpenAI API
    pub async fn create_video(
        &self,
        model: String,
        prompt: String,
        size: Option<String>,
        seconds: Option<String>,
    ) -> Result<String, String> {
        let url = format!("{}/videos", self.base_url);
        let request_body = OpenAIVideoRequest {
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

        let video_response: OpenAIVideoJobResponse = serde_json::from_str(&body)
            .map_err(|e| format!("Failed to parse video generation response: {}", e))?;

        Ok(video_response.clone().id)
    }

    /// Check the status of a video generation
    pub async fn check_video_status(
        &self,
        video_id: String,
    ) -> Result<OpenAIVideoJobResponse, String> {
        let url = format!("{}/videos/{}", self.base_url, video_id);
        let req = self.http.get(&url).headers(self.headers());
        let body = self.exec_request(req, "GET", &url).await?;
        let video_response: OpenAIVideoJobResponse = serde_json::from_str(&body)
            .map_err(|e| format!("Failed to parse video status response: {}", e))?;

        Ok(video_response.clone())
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
