use serde::{Deserialize, Serialize};

// ============================================================================
// Store Constants
// ============================================================================

pub const STORE_NAME: &str = "store.json";
pub const KEY_NAME: &str = "openai_api_key";

// ============================================================================
// Video API Types
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoRequest {
    pub model: String,
    pub prompt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seconds: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct VideoJobResponse {
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
// Responses API Types
// ============================================================================

#[derive(Serialize, Deserialize, Clone)]
pub struct Input {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
    pub content: Vec<ContentPart>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ContentPart {
    InputText { text: String },
    InputImage { image_url: String },
}

#[derive(Serialize)]
pub struct ResponseRequest {
    pub model: String,
    pub input: Vec<Input>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<serde_json::Value>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ResponseData {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_text: Option<String>,
    #[serde(default)]
    pub output: serde_json::Value,
}
