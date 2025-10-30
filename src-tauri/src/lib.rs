mod commands;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_keyring::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            // api key commands
            save_api_key,
            get_api_key,
            remove_api_key,
            // workspace & projects commands
            get_workspace_dir,
            ensure_workspace_exists,
            ensure_dir_exists,
            list_projects,
            create_project,
            delete_project,
            get_project,
            add_videos_to_project,
            delete_video_from_project,
            // image commands
            save_image,
            get_image,
            delete_image,
            resize_image,
            // storyboard commands
            read_context,
            write_context,
            list_scenes,
            read_scene,
            write_scene,
            delete_scene,
            reorder_scenes,
            // video editor commands
            create_preview_video,
            save_editor_state,
            load_editor_state,
            export_video
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
