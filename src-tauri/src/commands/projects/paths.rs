//! Project path management utilities
//!
//! This module provides a structured way to work with project paths.
//!
//! # Directory Structure
//!
//! ```text
//! ~/sixsevenstudio/projects/<project_name>/
//! ├── .sixseven/
//! │   ├── metadata.json
//! │   └── editor_state.json
//! ├── images/
//! │   └── scene_*_reference.jpg
//! ├── videos/
//! │   └── <video_id>.mp4
//! └── storyboard/
//!     ├── context.md
//!     └── scenes/
//!         ├── index.json
//!         ├── <scene_id>/
//!         │   └── scene.md
//!         ├── <scene_id>/
//!         │   └── scene.md
//!         └── ...
//! ```

use std::env;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

use super::filesystem::{ensure_dir, sanitize_project_name};

const WORKSPACE_FOLDER: &str = "sixsevenstudio";
const PROJECT_META_DIR: &str = ".sixseven";
const PROJECT_META_FILE: &str = "metadata.json";
const EDITOR_STATE_FILE: &str = "editor_state.json";
const IMAGES_FOLDER: &str = "images";
const VIDEOS_FOLDER: &str = "videos";
const STORYBOARD_DIR: &str = "storyboard";
const CONTEXT_FILE: &str = "context.md";
const SCENES_FOLDER: &str = "scenes";
const SCENES_INDEX_FILE: &str = "index.json";
const SCENE_FILE: &str = "scene.md";

pub struct ProjectPaths {
    root: PathBuf,
}

impl ProjectPaths {
    /// Create from an existing project path
    pub fn new(project_path: impl Into<PathBuf>) -> Self {
        Self {
            root: project_path.into(),
        }
    }

    fn default_workspace_dir() -> PathBuf {
        let home = env::var("HOME")
            .or_else(|_| env::var("USERPROFILE"))
            .ok()
            .map(PathBuf::from)
            .unwrap_or_else(|| env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));
        home.join(WORKSPACE_FOLDER)
    }

    /// ~/sixsevenstudio
    pub fn workspace(_app: &AppHandle) -> Result<PathBuf, String> {
        let workspace = Self::default_workspace_dir();
        ensure_dir(&workspace)?;
        Ok(workspace)
    }

    pub fn from_name(app: &AppHandle, project_name: &str) -> Result<Self, String> {
        let workspace = Self::workspace(app)?;
        let name = sanitize_project_name(project_name)?;
        let project_path = workspace.join(&name);

        if !project_path.exists() {
            return Err(format!("Project '{}' does not exist", project_name));
        }

        Ok(Self::new(project_path))
    }

    pub fn from_name_create_if_not_exists(
        app: &AppHandle,
        project_name: &str,
    ) -> Result<Self, String> {
        let workspace = Self::workspace(app)?;
        let name = sanitize_project_name(project_name)?;
        let project_path = workspace.join(&name);
        ensure_dir(&project_path)?;
        Ok(Self::new(project_path))
    }

    /// Get the root project directory path
    pub fn root(&self) -> &Path {
        &self.root
    }

    /// ~/sixsevenstudio/projects/<project_name>/.sixseven/metadata.json
    pub fn metadata_file(&self) -> PathBuf {
        self.root.join(PROJECT_META_DIR).join(PROJECT_META_FILE)
    }

    pub fn editor_state_file(&self) -> PathBuf {
        self.root.join(PROJECT_META_DIR).join(EDITOR_STATE_FILE)
    }

    /// ~/sixsevenstudio/projects/<project_name>/images/
    pub fn images_dir(&self) -> PathBuf {
        self.root.join(IMAGES_FOLDER)
    }

    /// ~/sixsevenstudio/projects/<project_name>/images/<image_name>
    pub fn image_file(&self, image_name: &str) -> PathBuf {
        self.images_dir().join(image_name)
    }

    /// ~/sixsevenstudio/projects/<project_name>/videos/
    pub fn videos_dir(&self) -> PathBuf {
        self.root.join(VIDEOS_FOLDER)
    }

    /// ~/sixsevenstudio/projects/<project_name>/videos/<video_id>.mp4
    pub fn video_file(&self, video_id: &str) -> PathBuf {
        self.videos_dir().join(video_id)
    }

    /// ~/sixsevenstudio/projects/<project_name>/storyboard/
    pub fn storyboard_dir(&self) -> PathBuf {
        self.root.join(STORYBOARD_DIR)
    }

    /// ~/sixsevenstudio/projects/<project_name>/storyboard/context.md
    pub fn context_file(&self) -> PathBuf {
        self.storyboard_dir().join(CONTEXT_FILE)
    }

    /// ~/sixsevenstudio/projects/<project_name>/storyboard/scenes/
    pub fn scenes_dir(&self) -> PathBuf {
        self.storyboard_dir().join(SCENES_FOLDER)
    }

    /// ~/sixsevenstudio/projects/<project_name>/storyboard/scenes/index.json
    pub fn scenes_index(&self) -> PathBuf {
        self.scenes_dir().join(SCENES_INDEX_FILE)
    }

    /// ~/sixsevenstudio/projects/<project_name>/storyboard/scenes/<scene_id>/
    pub fn scene_dir(&self, scene_id: &str) -> PathBuf {
        self.scenes_dir().join(scene_id)
    }

    /// ~/sixsevenstudio/projects/<project_name>/storyboard/scenes/<scene_id>/scene.md
    pub fn scene_file(&self, scene_id: &str) -> PathBuf {
        self.scene_dir(scene_id).join(SCENE_FILE)
    }
}
