use super::filesystem;
use super::types::{Scene, StoryboardData};
use crate::commands::openai::{create_openai_response, ContentPart, Input};
use crate::utils::image::read_image_as_data_url;
use std::fs;
use std::path::{Path, PathBuf};

fn get_storyboard_system_instruction() -> Result<String, String> {
    let prompt_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("prompts")
        .join("storyboard_system_instruction.txt");

    fs::read_to_string(&prompt_path)
        .map_err(|e| format!("Failed to read storyboard system instruction: {}", e))
}

pub async fn create_storyboard(
    app: tauri::AppHandle,
    project_name: String,
    prompt: String,
    model: Option<String>,
) -> Result<StoryboardData, String> {
    let project_path = filesystem::get_project_path(&app, &project_name)?;
    let project_meta = filesystem::read_project_meta(&project_path)?;

    // Build input and get response_id for refinement
    let (user_message, response_id) = if let Some(id) = &project_meta.storyboard_response_id {
        let current = filesystem::read_storyboard_data(&project_path)?
            .ok_or("Response ID exists but no storyboard found")?;
        let json = serde_json::to_string_pretty(&current)
            .map_err(|e| format!("Failed to serialize storyboard: {}", e))?;
        let msg = format!(
            "Current storyboard:\n\n{}\n\nRefine based on: {}",
            json, prompt
        );
        (msg, Some(id.clone()))
    } else {
        (prompt, None)
    };

    // Build user content with optional image
    let mut user_content = vec![];

    // Add image if available
    if let Some(image_path) = &project_meta.image_path {
        if Path::new(image_path).exists() {
            match read_image_as_data_url(image_path) {
                Ok(data_url) => {
                    user_content.push(ContentPart::Image {
                        image_url: data_url,
                    });
                }
                Err(e) => {
                    // Log error but continue without image
                    eprintln!("Failed to read image {}: {}", image_path, e);
                }
            }
        }
    }

    user_content.push(ContentPart::Text {
        text: user_message.to_string(),
    });

    let system_instruction = get_storyboard_system_instruction()?;

    let input = vec![
        Input {
            role: Some("system".to_string()),
            content: vec![ContentPart::Text {
                text: system_instruction,
            }],
        },
        Input {
            role: Some("user".to_string()),
            content: user_content,
        },
    ];

    // Call OpenAI and parse response
    let response = create_openai_response(
        app.clone(),
        model.unwrap_or_else(|| "gpt-4o".to_string()),
        input,
        None,
        response_id,
    )
    .await?;

    let storyboard = parse_storyboard_from_response(&response.output)?;

    // Save storyboard and response_id
    filesystem::write_storyboard_data(&project_path, &storyboard)?;
    let mut meta = filesystem::read_project_meta(&project_path)?;
    meta.storyboard_response_id = Some(response.id);
    filesystem::write_project_meta(&project_path, &meta)?;

    Ok(storyboard)
}

fn parse_storyboard_from_response(output: &serde_json::Value) -> Result<StoryboardData, String> {
    // Extract text from nested response structure
    let json_text = extract_response_text(output)?;
    let json_value: serde_json::Value =
        serde_json::from_str(json_text).map_err(|e| format!("Failed to parse JSON: {}", e))?;
    parse_storyboard_from_json(&json_value)
}

fn extract_response_text(output: &serde_json::Value) -> Result<&str, String> {
    // Try nested array structure: output[{type:"message", content:[{type:"output_text", text:"..."}]}]
    if let Some(array) = output.as_array() {
        return array
            .iter()
            .find(|item| item.get("type").and_then(|t| t.as_str()) == Some("message"))
            .and_then(|msg| msg.get("content")?.as_array())
            .and_then(|content| {
                content
                    .iter()
                    .find(|item| item.get("type").and_then(|t| t.as_str()) == Some("output_text"))
            })
            .and_then(|text_obj| text_obj.get("text")?.as_str())
            .ok_or_else(|| "No output_text found in response".to_string());
    }

    // Fallback: direct text field
    output
        .get("text")
        .and_then(|t| t.as_str())
        .ok_or_else(|| "Unexpected response format".to_string())
}

fn parse_storyboard_from_json(json: &serde_json::Value) -> Result<StoryboardData, String> {
    let scenes = json
        .get("scenes")
        .and_then(|s| s.as_array())
        .ok_or("Missing 'scenes' field")?
        .iter()
        .map(|s| {
            Ok(Scene {
                id: s
                    .get("id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("1")
                    .to_string(),
                title: s
                    .get("title")
                    .and_then(|v| v.as_str())
                    .ok_or("Missing 'title'")?
                    .to_string(),
                description: s
                    .get("description")
                    .and_then(|v| v.as_str())
                    .ok_or("Missing 'description'")?
                    .to_string(),
                duration: s
                    .get("duration")
                    .and_then(|v| v.as_str())
                    .unwrap_or("3s")
                    .to_string(),
            })
        })
        .collect::<Result<Vec<_>, &str>>()
        .map_err(|e| e.to_string())?;

    let global_style = json
        .get("global_style")
        .and_then(|v| v.as_str())
        .unwrap_or("Cinematic global with smooth transitions")
        .to_string();

    Ok(StoryboardData {
        scenes,
        global_style,
    })
}
