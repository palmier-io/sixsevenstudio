use serde::{Deserialize, Serialize};


pub const STORE_NAME: &str = "store.json";
pub const KEY_NAME: &str = "openai_api_key";

#[derive(Debug, Serialize, Deserialize)]
pub struct OpenAIVideoRequest {
    // https://platform.openai.com/docs/api-reference/videos/create
    pub model: String,
    pub prompt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seconds: Option<String>,
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
