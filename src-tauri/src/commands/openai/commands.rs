use std::path::Path;
use tauri_plugin_log::log;
use tauri_plugin_store::StoreExt;

use super::client::OpenAIClient;
use super::types::{Input, KEY_NAME, STORE_NAME, ResponseData, ResponseRequest, VideoJobResponse};

// ============================================================================
// API Key Store Commands
// ============================================================================

#[tauri::command]
pub async fn save_api_key(app: tauri::AppHandle, api_key: String) -> Result<(), String> {
    let store = app.store(STORE_NAME).map_err(|e| e.to_string())?;
    store.set(KEY_NAME, api_key);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

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

// ============================================================================
// Video Commands
// ============================================================================

#[tauri::command]
pub async fn get_video_status(
    app: tauri::AppHandle,
    video_id: String,
) -> Result<VideoJobResponse, String> {
    let api_key = get_api_key_from_store(&app).await?;
    let client = OpenAIClient::new(api_key);
    let video_response = client.check_video_status(video_id.clone()).await?;
    log::debug!(
        "Checking video status for {} -> {:?}",
        video_id,
        video_response
    );
    Ok(video_response)
}

#[tauri::command]
pub async fn create_video(
    app: tauri::AppHandle,
    model: String,
    prompt: String,
    size: Option<String>,
    seconds: Option<String>,
    input_reference_path: Option<String>,
) -> Result<String, String> {
    let api_key = get_api_key_from_store(&app).await?;
    let client = OpenAIClient::new(api_key);
    let video_id = client.create_video(model, prompt, size, seconds, input_reference_path).await?;
    Ok(video_id)
}

#[tauri::command]
pub fn file_exists(file_path: String) -> bool {
    Path::new(&file_path).exists()
}

/// Download video from OpenAI API to specified path
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

    let bytes = client.download_video_content(&video_id).await?;

    std::fs::write(&save_path, bytes)
        .map_err(|e| format!("Failed to save video to {}: {}", save_path, e))?;

    Ok(())
}

// ============================================================================
// Responses Commands
// ============================================================================

#[tauri::command]
pub async fn create_openai_response(
    app: tauri::AppHandle,
    model: String,
    input: Vec<Input>,
    tools: Option<Vec<serde_json::Value>>,
    previous_response_id: Option<String>,
) -> Result<ResponseData, String> {
    let api_key = get_api_key_from_store(&app).await?;
    let client = OpenAIClient::new(api_key);

    let request = ResponseRequest {
        model,
        input,
        tools,
        previous_response_id,
    };

    let response_data = client.create_response(request).await?;
    Ok(response_data)
}

// Helper function with error handling
async fn get_api_key_from_store(app: &tauri::AppHandle) -> Result<String, String> {
    get_api_key(app.clone())
        .await?
        .ok_or_else(|| "API key not found. Please set your OpenAI API key in settings.".to_string())
}