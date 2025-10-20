mod commands;
use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            // openai api key commands
            save_api_key,
            get_api_key,
            remove_api_key,
            // openai video commands
            create_video,
            get_video_status,
            download_video,
            file_exists,
            // openai responses commands
            create_openai_response,
            // workspace & projects commands
            get_workspace_dir,
            ensure_workspace_exists,
            list_projects,
            create_project,
            delete_project,
            get_project,
            add_videos_to_project,
            delete_video_from_project,
            // storyboard commands
            get_storyboard,
            save_storyboard,
            delete_storyboard,
            generate_storyboard,
            get_prompt_from_storyboard,
            // image commands
            save_image,
            get_image,
            delete_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
