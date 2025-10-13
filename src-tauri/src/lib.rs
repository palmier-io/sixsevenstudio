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
            check_video_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
