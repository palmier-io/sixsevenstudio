mod commands;
use commands::*;


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            save_api_key,
            get_api_key,
            remove_api_key,
            generate_video,
            check_video_status,
            start_video_generation_with_polling,
            download_video,
            // workspace & projects
            get_workspace_dir,
            ensure_workspace_exists,
            list_projects,
            create_project,
            rename_project,
            delete_project,
            // project metadata & videos
            add_video_to_project,
            list_project_videos,
            get_project_meta,
            update_project_meta,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
