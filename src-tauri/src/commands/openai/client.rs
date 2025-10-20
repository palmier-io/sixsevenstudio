use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};

#[derive(Clone)]
pub struct OpenAIClient {
    pub http: reqwest::Client,
    pub api_key: String,
    pub base_url: String,
}

impl OpenAIClient {
    pub fn new(api_key: String) -> Self {
        Self {
            http: reqwest::Client::new(),
            api_key,
            base_url: "https://api.openai.com/v1".to_string(),
        }
    }

    pub fn headers(&self, content_type: Option<&'static str>) -> HeaderMap {
        let mut headers = HeaderMap::new();

        if let Ok(auth_value) = HeaderValue::from_str(&format!("Bearer {}", self.api_key)) {
            headers.insert(AUTHORIZATION, auth_value);
        }

        if let Some(ct) = content_type {
            headers.insert(CONTENT_TYPE, HeaderValue::from_static(ct));
        }

        headers
    }

    pub async fn exec_request(
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
}
