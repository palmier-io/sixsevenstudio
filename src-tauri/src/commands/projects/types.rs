use serde::{Deserialize, Serialize};

pub const WORKSPACE_FOLDER: &str = "sixsevenstudio";
pub const PROJECT_META_DIR: &str = ".sixseven";
pub const PROJECT_META_FILE: &str = "metadata.json";
pub const STORYBOARD_FILE: &str = "storyboard.json";

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
    pub animation_style: String,
}
