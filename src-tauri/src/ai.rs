use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;

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
