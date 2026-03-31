use crate::ai;
use crate::dictionary;
use tauri::ipc::Channel;

#[tauri::command]
pub async fn lookup_dictionary(word: String) -> Result<dictionary::DictResult, String> {
    Ok(dictionary::lookup(&word).await)
}

#[tauri::command]
pub async fn call_ai_analysis(
    content: String,
    provider: String,
    api_key: String,
    endpoint: Option<String>,
    model: Option<String>,
) -> Result<serde_json::Value, String> {
    if api_key.is_empty() {
        return Err("API Key 未配置，请先在设置中保存 API Key".to_string());
    }

    let result = ai::analyze_text(
        &content,
        &provider,
        &api_key,
        endpoint.as_deref(),
        model.as_deref(),
    )
    .await?;

    serde_json::to_value(&result)
        .map_err(|e| format!("Failed to serialize analysis result: {}", e))
}

#[tauri::command]
pub async fn call_ai_analysis_stream(
    content: String,
    provider: String,
    api_key: String,
    endpoint: Option<String>,
    model: Option<String>,
    on_event: Channel<ai::AnalysisEvent>,
) -> Result<serde_json::Value, String> {
    if api_key.is_empty() {
        return Err("API Key 未配置，请先在设置中保存 API Key".to_string());
    }

    let result = ai::analyze_text_stream(
        &content,
        &provider,
        &api_key,
        endpoint.as_deref(),
        model.as_deref(),
        on_event,
    )
    .await?;

    serde_json::to_value(&result)
        .map_err(|e| format!("Failed to serialize analysis result: {}", e))
}
