use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct ProjectSummary {
    pub name: String,
    pub path: String,
    pub created_at: i64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ProjectMeta {
    pub videos: Vec<VideoMeta>,
    pub path: String,
    pub created_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub storyboard_response_id: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct VideoMeta {
    pub id: String,
    pub prompt: String,
    pub model: String,
    pub resolution: String,
    pub duration: i32,
    pub created_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scene_number: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scene_title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sample_number: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remixed_from_video_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remix_prompt: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SceneSummary {
    pub id: String,
    pub title: String,
    pub duration: String,
    pub has_reference_image: bool,
    pub order: i32,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SceneDetails {
    pub id: String,
    pub title: String,
    pub duration: String,
    pub description: String,
    pub has_reference_image: bool,
    pub order: i32,
}
