use keyring::Entry;
use tauri_plugin_store::StoreExt;

const DEV_STORE_NAME: &str = "store.json";
const PROD_SERVICE_NAME: &str = "sixsevenstudio";
const KEY_NAME: &str = "openai_api_key";

fn is_dev_mode() -> bool {
    cfg!(debug_assertions)
}

async fn save_api_key_dev(app: &tauri::AppHandle, api_key: String) -> Result<(), String> {
    let store = app.store(DEV_STORE_NAME).map_err(|e| e.to_string())?;
    store.set(KEY_NAME, api_key);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

async fn save_api_key_prod(api_key: String) -> Result<(), String> {
    let entry = Entry::new(PROD_SERVICE_NAME, KEY_NAME)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    entry
        .set_password(&api_key)
        .map_err(|e| format!("Failed to save API key: {}", e))?;
    Ok(())
}

async fn get_api_key_dev(app: &tauri::AppHandle) -> Result<Option<String>, String> {
    let store = app.store(DEV_STORE_NAME).map_err(|e| e.to_string())?;
    let value_opt = store.get(KEY_NAME);
    let result = if let Some(value) = value_opt {
        value.as_str().map(|s| s.to_string())
    } else {
        None
    };
    Ok(result)
}

async fn get_api_key_prod() -> Result<Option<String>, String> {
    let entry = Entry::new(PROD_SERVICE_NAME, KEY_NAME)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    match entry.get_password() {
        Ok(password) => Ok(Some(password)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Failed to get API key: {}", e)),
    }
}

async fn remove_api_key_dev(app: &tauri::AppHandle) -> Result<(), String> {
    let store = app.store(DEV_STORE_NAME).map_err(|e| e.to_string())?;
    store.delete(KEY_NAME);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

async fn remove_api_key_prod() -> Result<(), String> {
    let entry = Entry::new(PROD_SERVICE_NAME, KEY_NAME)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    entry
        .delete_credential()
        .map_err(|e| format!("Failed to remove API key: {}", e))
}

#[tauri::command]
pub async fn save_api_key(app: tauri::AppHandle, api_key: String) -> Result<(), String> {
    if is_dev_mode() {
        save_api_key_dev(&app, api_key).await
    } else {
        save_api_key_prod(api_key).await
    }
}

#[tauri::command]
pub async fn get_api_key(app: tauri::AppHandle) -> Result<Option<String>, String> {
    if is_dev_mode() {
        get_api_key_dev(&app).await
    } else {
        get_api_key_prod().await
    }
}

#[tauri::command]
pub async fn remove_api_key(app: tauri::AppHandle) -> Result<(), String> {
    if is_dev_mode() {
        remove_api_key_dev(&app).await
    } else {
        remove_api_key_prod().await
    }
}
