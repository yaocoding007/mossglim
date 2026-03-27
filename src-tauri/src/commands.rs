use crate::ai;
use keyring::Entry;

const SERVICE: &str = "poweren";

fn keychain_entry(provider: &str) -> Result<Entry, String> {
    let user = format!("api_key_{}", provider);
    Entry::new(SERVICE, &user).map_err(|e| format!("Failed to access keychain: {}", e))
}

#[tauri::command]
pub async fn call_ai_analysis(
    content: String,
    provider: String,
) -> Result<serde_json::Value, String> {
    let entry = keychain_entry(&provider)?;
    let api_key = entry
        .get_password()
        .map_err(|e| format!("Failed to read API key from keychain: {}. Please save your API key first.", e))?;

    let result = ai::analyze_text(&content, &provider, &api_key).await?;

    serde_json::to_value(&result)
        .map_err(|e| format!("Failed to serialize analysis result: {}", e))
}

#[tauri::command]
pub fn save_api_key(provider: String, key: String) -> Result<(), String> {
    let entry = keychain_entry(&provider)?;
    entry
        .set_password(&key)
        .map_err(|e| format!("Failed to save API key to keychain: {}", e))
}

#[tauri::command]
pub fn get_api_key(provider: String) -> Result<String, String> {
    let entry = keychain_entry(&provider)?;
    entry
        .get_password()
        .map_err(|e| format!("Failed to read API key from keychain: {}", e))
}
