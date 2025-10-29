use keyring::Entry;

const SERVICE_NAME: &str = "sixsevenstudio";
const KEY_NAME: &str = "openai_api_key";

#[tauri::command]
pub async fn save_api_key(_app: tauri::AppHandle, api_key: String) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, KEY_NAME)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    entry
        .set_password(&api_key)
        .map_err(|e| format!("Failed to save API key: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn get_api_key(_app: tauri::AppHandle) -> Result<Option<String>, String> {
    let entry = Entry::new(SERVICE_NAME, KEY_NAME)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    match entry.get_password() {
        Ok(password) => Ok(Some(password)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Failed to get API key: {}", e)),
    }
}

#[tauri::command]
pub async fn remove_api_key(_app: tauri::AppHandle) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, KEY_NAME)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()), // Already deleted, treat as success
        Err(e) => Err(format!("Failed to remove API key: {}", e)),
    }
}
