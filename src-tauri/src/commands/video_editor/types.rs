use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelineClip {
    pub id: String,
    pub name: String,
    pub video_path: String,
    pub thumbnail: Option<String>,
    pub original_duration: f64,
    pub created_at: i64,
    pub position: f64,
    pub trim_start: f64,
    pub trim_end: f64,
    pub duration: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EditorState {
    pub clips: Vec<TimelineClip>,
    pub selected_clip_id: Option<String>,
    pub current_playback_time: Option<f64>,
    pub preview_video_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportProgress {
    pub progress: f64,
    pub message: String,
    pub status: String,
}
