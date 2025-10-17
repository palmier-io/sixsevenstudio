use super::client::OpenAIClient;
use super::types::{ResponseData, ResponseRequest};

impl OpenAIClient {
    pub async fn create_response(
        &self,
        request: ResponseRequest,
    ) -> Result<ResponseData, String> {
        let url = format!("{}/responses", self.base_url);

        let req = self
            .http
            .post(&url)
            .headers(self.headers())
            .json(&request);

        let body = self.exec_request(req, "POST", &url).await?;

        let response_data: ResponseData = serde_json::from_str(&body)
            .map_err(|e| format!("Failed to parse response data: {}", e))?;

        Ok(response_data)
    }
}