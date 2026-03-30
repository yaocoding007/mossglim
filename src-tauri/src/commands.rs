use crate::ai;

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
