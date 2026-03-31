use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::ipc::Channel;

#[derive(Debug, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub translation: String,
    pub sentences: Vec<SentenceAnalysis>,
    pub highlights: Vec<Highlight>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SentenceAnalysis {
    pub original: String,
    pub structure: Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Highlight {
    pub text: String,
    #[serde(rename = "type")]
    pub highlight_type: String,
    pub definition: String,
}

#[derive(Clone, Serialize)]
#[serde(tag = "event", content = "data")]
pub enum AnalysisEvent {
    Progress { tokens_received: usize },
    Translation { text: String },
}

const SYSTEM_PROMPT: &str = r#"You are an English language analysis assistant. Analyze the given English text and return a JSON object with exactly this structure:
{
  "translation": "<Chinese translation of the full text>",
  "sentences": [
    {
      "original": "<original sentence>",
      "structure": {
        "subject": { "text": "<subject text>", "role": "主语" },
        "predicate": { "text": "<predicate text>", "role": "谓语" },
        "object": { "text": "<object text>", "role": "宾语" },
        "modifiers": [
          { "text": "<modifier text>", "role": "状语|定语|定语从句|补语", "modifies": "<what it modifies>" }
        ]
      }
    }
  ],
  "highlights": [
    {
      "text": "<word or phrase>",
      "type": "word|phrase|grammar",
      "definition": "<Chinese definition with part of speech, e.g. n. 人工智能>"
    }
  ]
}

Important rules:
- Return ONLY valid JSON, no markdown fences, no extra text.
- "translation" is the full Chinese translation.
- "sentences" breaks the text into individual sentences with grammatical structure.
- Each structure field (subject, predicate, object) MUST be an object with "text" and "role" keys.
- "modifiers" is an array of objects, each with "text", "role", and "modifies" keys.
- If a sentence has no object, use { "text": "", "role": "宾语" }.
- "highlights" should include words, phrases, and grammar points that have learning value for an intermediate English learner. Skip basic/common words (e.g. "the", "is", "a", "in", "to", "and", "it", "that", "this", "have", "do", "be", "for", "on", "with", "as", "at", "by", "from", "or", "an", "but", "not", "you", "we", "they", "he", "she", "my", "your", "can", "will", "would", "could", "should", "may", "might"). Focus on: vocabulary above elementary level, idiomatic phrases, phrasal verbs, and noteworthy grammar patterns.
- "type" must be one of: "word", "phrase", "grammar"."#;

pub async fn analyze_text(
    content: &str,
    provider: &str,
    api_key: &str,
    endpoint: Option<&str>,
    model: Option<&str>,
) -> Result<AnalysisResult, String> {
    let client = Client::new();

    // First attempt
    let raw = call_api(&client, content, provider, api_key, endpoint, model).await?;
    match serde_json::from_str::<AnalysisResult>(&raw) {
        Ok(result) => return Ok(result),
        Err(_) => {
            // Retry once on JSON parse failure
            let raw_retry = call_api(&client, content, provider, api_key, endpoint, model).await?;
            serde_json::from_str::<AnalysisResult>(&raw_retry)
                .map_err(|e| format!("Failed to parse AI response as JSON after retry: {}", e))
        }
    }
}

async fn call_api(
    client: &Client,
    content: &str,
    provider: &str,
    api_key: &str,
    endpoint: Option<&str>,
    model: Option<&str>,
) -> Result<String, String> {
    match provider {
        "claude" => call_claude(client, content, api_key).await,
        "openai" => call_openai(client, content, api_key).await,
        "custom" => {
            let ep = endpoint.ok_or("自定义服务商未配置 API 地址")?;
            let m = model.ok_or("自定义服务商未配置模型名称")?;
            call_custom(client, content, api_key, ep, m).await
        }
        _ => Err(format!("Unsupported provider: {}", provider)),
    }
}

async fn call_claude(
    client: &Client,
    content: &str,
    api_key: &str,
) -> Result<String, String> {
    let body = serde_json::json!({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 8192,
        "system": SYSTEM_PROMPT,
        "messages": [
            {
                "role": "user",
                "content": format!("Please analyze the following English text:\n\n{}", content)
            }
        ]
    });

    let resp = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to call Claude API: {}", e))?;

    let status = resp.status();
    let resp_body: Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to read Claude response: {}", e))?;

    if !status.is_success() {
        return Err(format!(
            "Claude API error ({}): {}",
            status,
            resp_body
        ));
    }

    // Extract text from Claude's response format: content[0].text
    resp_body["content"][0]["text"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Unexpected Claude response structure".to_string())
}

async fn call_openai(
    client: &Client,
    content: &str,
    api_key: &str,
) -> Result<String, String> {
    let body = serde_json::json!({
        "model": "gpt-4o",
        "messages": [
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": format!("Please analyze the following English text:\n\n{}", content)
            }
        ],
        "temperature": 0.3
    });

    let resp = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to call OpenAI API: {}", e))?;

    let status = resp.status();
    let resp_body: Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to read OpenAI response: {}", e))?;

    if !status.is_success() {
        return Err(format!(
            "OpenAI API error ({}): {}",
            status,
            resp_body
        ));
    }

    // Extract text from OpenAI's response format: choices[0].message.content
    resp_body["choices"][0]["message"]["content"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Unexpected OpenAI response structure".to_string())
}

async fn call_custom(
    client: &Client,
    content: &str,
    api_key: &str,
    endpoint: &str,
    model: &str,
) -> Result<String, String> {
    let body = serde_json::json!({
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": format!("Please analyze the following English text:\n\n{}", content)
            }
        ],
        "temperature": 0.3,
        "max_tokens": 8192
    });

    let resp = client
        .post(endpoint)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to call custom API: {}", e))?;

    let status = resp.status();
    let resp_body: Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to read custom API response: {}", e))?;

    if !status.is_success() {
        return Err(format!(
            "Custom API error ({}): {}",
            status,
            resp_body
        ));
    }

    // OpenAI-compatible format: choices[0].message.content
    resp_body["choices"][0]["message"]["content"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Unexpected custom API response structure".to_string())
}

// ---------------------------------------------------------------------------
// Streaming API
// ---------------------------------------------------------------------------

pub async fn analyze_text_stream(
    content: &str,
    provider: &str,
    api_key: &str,
    endpoint: Option<&str>,
    model: Option<&str>,
    channel: Channel<AnalysisEvent>,
) -> Result<AnalysisResult, String> {
    let client = Client::new();

    // Try streaming first
    let raw = call_api_stream(&client, content, provider, api_key, endpoint, model, &channel).await?;
    match serde_json::from_str::<AnalysisResult>(&raw) {
        Ok(result) => Ok(result),
        Err(_) => {
            // Fallback: retry with non-streaming API
            let raw_retry = call_api(&client, content, provider, api_key, endpoint, model).await?;
            serde_json::from_str::<AnalysisResult>(&raw_retry)
                .map_err(|e| format!("Failed to parse AI response as JSON after retry: {}", e))
        }
    }
}

async fn call_api_stream(
    client: &Client,
    content: &str,
    provider: &str,
    api_key: &str,
    endpoint: Option<&str>,
    model: Option<&str>,
    channel: &Channel<AnalysisEvent>,
) -> Result<String, String> {
    match provider {
        "claude" => call_api_stream_claude(client, content, api_key, channel).await,
        "openai" => call_api_stream_openai(client, content, api_key, "https://api.openai.com/v1/chat/completions", "gpt-4o", channel).await,
        "custom" => {
            let ep = endpoint.ok_or("自定义服务商未配置 API 地址")?;
            let m = model.ok_or("自定义服务商未配置模型名称")?;
            call_api_stream_openai(client, content, api_key, ep, m, channel).await
        }
        _ => Err(format!("Unsupported provider: {}", provider)),
    }
}

async fn call_api_stream_openai(
    client: &Client,
    content: &str,
    api_key: &str,
    endpoint: &str,
    model: &str,
    channel: &Channel<AnalysisEvent>,
) -> Result<String, String> {
    let body = serde_json::json!({
        "model": model,
        "messages": [
            { "role": "system", "content": SYSTEM_PROMPT },
            { "role": "user", "content": format!("Please analyze the following English text:\n\n{}", content) }
        ],
        "temperature": 0.3,
        "max_tokens": 8192,
        "stream": true
    });

    let resp = client
        .post(endpoint)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to call API: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let err_body = resp.text().await.unwrap_or_default();
        return Err(format!("API error ({}): {}", status, err_body));
    }

    let mut accumulated = String::new();
    let mut token_count: usize = 0;
    let mut sse_buffer = String::new();
    let mut translation_sent = false;

    let mut stream = resp;
    while let Some(chunk) = stream.chunk().await.map_err(|e| format!("Stream read error: {}", e))? {
        let text = String::from_utf8_lossy(&chunk);
        sse_buffer.push_str(&text);

        while let Some(line_end) = sse_buffer.find('\n') {
            let line = sse_buffer[..line_end].trim_end_matches('\r').to_string();
            sse_buffer = sse_buffer[line_end + 1..].to_string();

            if line.starts_with("data: ") {
                let data = &line[6..];
                if data == "[DONE]" {
                    break;
                }
                if let Ok(parsed) = serde_json::from_str::<Value>(data) {
                    if let Some(delta) = parsed["choices"][0]["delta"]["content"].as_str() {
                        accumulated.push_str(delta);
                        token_count += 1;

                        if token_count % 10 == 0 {
                            let _ = channel.send(AnalysisEvent::Progress { tokens_received: token_count });
                        }

                        if !translation_sent {
                            if let Some(t) = try_extract_translation(&accumulated) {
                                let _ = channel.send(AnalysisEvent::Translation { text: t });
                                translation_sent = true;
                            }
                        }
                    }
                }
            }
        }
    }

    // Final progress
    let _ = channel.send(AnalysisEvent::Progress { tokens_received: token_count });

    Ok(accumulated)
}

async fn call_api_stream_claude(
    client: &Client,
    content: &str,
    api_key: &str,
    channel: &Channel<AnalysisEvent>,
) -> Result<String, String> {
    let body = serde_json::json!({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 8192,
        "system": SYSTEM_PROMPT,
        "messages": [
            {
                "role": "user",
                "content": format!("Please analyze the following English text:\n\n{}", content)
            }
        ],
        "stream": true
    });

    let resp = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to call Claude API: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let err_body = resp.text().await.unwrap_or_default();
        return Err(format!("Claude API error ({}): {}", status, err_body));
    }

    let mut accumulated = String::new();
    let mut token_count: usize = 0;
    let mut sse_buffer = String::new();
    let mut translation_sent = false;

    let mut stream = resp;
    while let Some(chunk) = stream.chunk().await.map_err(|e| format!("Stream read error: {}", e))? {
        let text = String::from_utf8_lossy(&chunk);
        sse_buffer.push_str(&text);

        while let Some(line_end) = sse_buffer.find('\n') {
            let line = sse_buffer[..line_end].trim_end_matches('\r').to_string();
            sse_buffer = sse_buffer[line_end + 1..].to_string();

            if line.starts_with("data: ") {
                let data = &line[6..];
                if let Ok(parsed) = serde_json::from_str::<Value>(data) {
                    // Claude streaming: content_block_delta events contain delta.text
                    let event_type = parsed["type"].as_str().unwrap_or("");
                    if event_type == "content_block_delta" {
                        if let Some(delta_text) = parsed["delta"]["text"].as_str() {
                            accumulated.push_str(delta_text);
                            token_count += 1;

                            if token_count % 10 == 0 {
                                let _ = channel.send(AnalysisEvent::Progress { tokens_received: token_count });
                            }

                            if !translation_sent {
                                if let Some(t) = try_extract_translation(&accumulated) {
                                    let _ = channel.send(AnalysisEvent::Translation { text: t });
                                    translation_sent = true;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Final progress
    let _ = channel.send(AnalysisEvent::Progress { tokens_received: token_count });

    Ok(accumulated)
}

/// Try to extract the "translation" field value from partially accumulated JSON text.
/// Returns Some(translation_text) if a complete translation value is found.
fn try_extract_translation(text: &str) -> Option<String> {
    // Look for "translation": "..." pattern
    let marker = "\"translation\"";
    let marker_pos = text.find(marker)?;
    let after_key = &text[marker_pos + marker.len()..];

    // Skip whitespace and colon
    let after_colon = after_key.trim_start();
    let after_colon = after_colon.strip_prefix(':')?;
    let after_colon = after_colon.trim_start();

    // Must start with a quote
    let after_colon = after_colon.strip_prefix('"')?;

    // Find the closing quote, handling escaped quotes
    let mut chars = after_colon.chars();
    let mut value = String::new();
    let mut escaped = false;

    loop {
        match chars.next() {
            None => return None, // Incomplete
            Some('\\') if !escaped => {
                escaped = true;
                value.push('\\');
            }
            Some('"') if !escaped => {
                // Found closing quote - verify field is complete
                // by checking next non-whitespace is , or }
                let rest: String = chars.collect();
                let rest_trimmed = rest.trim_start();
                if rest_trimmed.starts_with(',') || rest_trimmed.starts_with('}') {
                    // Unescape the value
                    let unescaped = value
                        .replace("\\n", "\n")
                        .replace("\\\"", "\"")
                        .replace("\\\\", "\\");
                    return Some(unescaped);
                }
                return None; // Not yet confirmed complete
            }
            Some(c) => {
                escaped = false;
                value.push(c);
            }
        }
    }
}
