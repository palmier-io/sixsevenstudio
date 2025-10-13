use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use tauri_plugin_store::StoreExt;

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
struct OpenAIVideoRequest {
    model: String,
    prompt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    resolution: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    duration: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OpenAIVideoResponse {
    pub id: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

// ============================================================================
// OpenAI Client
// ============================================================================

/// Client for interacting with the OpenAI API
#[derive(Clone)]
struct OpenAIClient {
    http: reqwest::Client,
    api_key: String,
    base_url: String,
}

impl OpenAIClient {
    /// Create a new OpenAI client with the given API key
    fn new(api_key: String) -> Self {
        Self {
            http: reqwest::Client::new(),
            api_key,
            base_url: "https://api.openai.com/v1".to_string(),
        }
    }

    /// Build headers for API requests
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
            return Err(format!("{} {} failed with status {}: {}", method, url, status, error_text));
        }

        response
            .text()
            .await
            .map_err(|e| format!("Failed to read response body: {}", e))
    }

    /// Generate a video using the OpenAI API
    async fn generate_video(
        &self,
        model: String,
        prompt: String,
        resolution: Option<String>,
        duration: Option<String>,
    ) -> Result<String, String> {
        let url = format!("{}/video/generations", self.base_url);
        
        let request_body = OpenAIVideoRequest {
            model,
            prompt,
            resolution,
            duration,
        };

        let req = self
            .http
            .post(&url)
            .headers(self.headers())
            .json(&request_body);

        let body = self.exec_request(req, "POST", &url).await?;

        let video_response: OpenAIVideoResponse = serde_json::from_str(&body)
            .map_err(|e| format!("Failed to parse video generation response: {}", e))?;

        Ok(video_response.id)
    }

    /// Check the status of a video generation
    async fn check_video_status(
        &self,
        generation_id: String,
    ) -> Result<OpenAIVideoResponse, String> {
        let url = format!("{}/video/generations/{}", self.base_url, generation_id);

        let req = self.http.get(&url).headers(self.headers());

        let body = self.exec_request(req, "GET", &url).await?;

        let video_response: OpenAIVideoResponse = serde_json::from_str(&body)
            .map_err(|e| format!("Failed to parse video status response: {}", e))?;

        Ok(video_response)
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Get API key from the Tauri store
async fn get_api_key_from_store(app: &tauri::AppHandle) -> Result<String, String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    store
        .get("openai_api_key")
        .and_then(|v| v.as_str().map(String::from))
        .ok_or_else(|| "API key not found. Please set your OpenAI API key in settings.".to_string())
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Save API key to store
#[tauri::command]
pub async fn save_api_key(app: tauri::AppHandle, api_key: String) -> Result<(), String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    store.set("openai_api_key", api_key);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

/// Get API key from store
#[tauri::command]
pub async fn get_api_key(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    let key = store.get("openai_api_key").and_then(|v| v.as_str().map(String::from));
    Ok(key)
}

/// Remove API key from store
#[tauri::command]
pub async fn remove_api_key(app: tauri::AppHandle) -> Result<(), String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    store.delete("openai_api_key");
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

/// Generate video using OpenAI API
#[tauri::command]
pub async fn generate_video(
    app: tauri::AppHandle,
    model: String,
    prompt: String,
    resolution: Option<String>,
    duration: Option<String>,
) -> Result<String, String> {
    let api_key = get_api_key_from_store(&app).await?;
    let client = OpenAIClient::new(api_key);
    client.generate_video(model, prompt, resolution, duration).await
}

/// Check video generation status
#[tauri::command]
pub async fn check_video_status(
    app: tauri::AppHandle,
    generation_id: String,
) -> Result<OpenAIVideoResponse, String> {
    let api_key = get_api_key_from_store(&app).await?;
    let client = OpenAIClient::new(api_key);
    client.check_video_status(generation_id).await
}

