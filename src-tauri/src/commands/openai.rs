use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri_plugin_store::StoreExt;
use tauri_plugin_log::log;


// ============================================================================
// Constants
// ============================================================================

const STORE_NAME: &str = "store.json";
const KEY_NAME: &str = "openai_api_key";

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
struct OpenAIVideoRequest {
    // https://platform.openai.com/docs/api-reference/videos/create
    model: String,
    prompt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    size: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    seconds: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct OpenAIVideoJobResponse {
    // https://platform.openai.com/docs/api-reference/videos/object
    pub id: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub object: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub progress: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remixed_from_video_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seconds: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
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
    async fn create_video(
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
    async fn check_video_status(&self, video_id: String) -> Result<OpenAIVideoJobResponse, String> {
        let url = format!("{}/videos/{}", self.base_url, video_id);
        let req = self.http.get(&url).headers(self.headers());
        let body = self.exec_request(req, "GET", &url).await?;
        let video_response: OpenAIVideoJobResponse = serde_json::from_str(&body)
            .map_err(|e| format!("Failed to parse video status response: {}", e))?;

        Ok(video_response.clone())
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

async fn get_api_key_from_store(app: &tauri::AppHandle) -> Result<String, String> {
    get_api_key(app.clone())
        .await?
        .ok_or_else(|| "API key not found. Please set your OpenAI API key in settings.".to_string())
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Save API key to store
#[tauri::command]
pub async fn save_api_key(app: tauri::AppHandle, api_key: String) -> Result<(), String> {
    let store = app.store(STORE_NAME).map_err(|e| e.to_string())?;
    store.set(KEY_NAME, api_key);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

/// Get API key from store
#[tauri::command]
pub async fn get_api_key(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let store = app.store(STORE_NAME).map_err(|e| e.to_string())?;
    let value_opt = store.get(KEY_NAME);
    let result = if let Some(value) = value_opt {
        value.as_str().map(|s| s.to_string())
    } else {
        None
    };
    Ok(result)
}

/// Remove API key from store
#[tauri::command]
pub async fn remove_api_key(app: tauri::AppHandle) -> Result<(), String> {
    let store = app.store(STORE_NAME).map_err(|e| e.to_string())?;
    store.delete(KEY_NAME);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_video_status(
    app: tauri::AppHandle,
    video_id: String,
) -> Result<OpenAIVideoJobResponse, String> {
    let api_key = get_api_key_from_store(&app).await?;
    let client = OpenAIClient::new(api_key);
    let video_response = client.check_video_status(video_id.clone()).await?;
    log::info!("Checking video status for {} -> {:?}", video_id, video_response);
    Ok(video_response)
}

#[tauri::command]
pub async fn create_video(
    app: tauri::AppHandle,
    model: String,
    prompt: String,
    size: Option<String>,
    seconds: Option<String>,
) -> Result<String, String> {
    let api_key = get_api_key_from_store(&app).await?;
    let client = OpenAIClient::new(api_key);
    let video_id = client.create_video(model, prompt, size, seconds).await?;
    Ok(video_id)
}

/// Check if a file exists at the specified path
#[tauri::command]
pub fn file_exists(file_path: String) -> bool {
    Path::new(&file_path).exists()
}

/// Download video from OpenAI API to specified path and save metadata to project
#[tauri::command]
pub async fn download_video(
    app: tauri::AppHandle,
    video_id: String,
    save_path: String,
) -> Result<(), String> {
    if Path::new(&save_path).exists() {
        log::info!("File {} already exists; skipping download.", save_path);
        return Ok(());
    }

    let api_key = get_api_key_from_store(&app).await?;
    let client = OpenAIClient::new(api_key);

    let url = format!("{}/videos/{}/content", client.base_url, video_id);

    let response = client
        .http
        .get(&url)
        .headers(client.headers())
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

    std::fs::write(&save_path, bytes)
        .map_err(|e| format!("Failed to save video to {}: {}", save_path, e))?;

    Ok(())
}
