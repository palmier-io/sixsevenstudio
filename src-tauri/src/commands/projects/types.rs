use serde::{Deserialize, Serialize};

pub const WORKSPACE_FOLDER: &str = "sixsevenstudio";
pub const PROJECT_META_DIR: &str = ".sixseven";
pub const PROJECT_META_FILE: &str = "metadata.json";
pub const STORYBOARD_FILE: &str = "storyboard.json";
pub const EDITOR_STATE_FILE: &str = "editor_state.json";
pub const IMAGES_FOLDER: &str = "images";

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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_path: Option<String>,
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
pub struct Scene {
    pub id: String,
    pub title: String,
    pub description: String,
    pub duration: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct StoryboardData {
    pub scenes: Vec<Scene>,
    pub global_context: String,
}
