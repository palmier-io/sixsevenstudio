use tauri_plugin_store::StoreExt;

const STORE_NAME: &str = "store.json";
const KEY_NAME: &str = "openai_api_key";

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

#[tauri::command]
pub async fn remove_api_key(app: tauri::AppHandle) -> Result<(), String> {
    let store = app.store(STORE_NAME).map_err(|e| e.to_string())?;
    store.delete(KEY_NAME);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}
