use crate::llm::types::{AnthropicRequest, AnthropicResponse, OpenAIMessage, ProviderConfig};

pub async fn generate(config: &ProviderConfig, prompt: &str, temperature: f32) -> Result<String, String> {
    let api_key = config.api_key.as_ref().ok_or("API key not configured")?;
    let client = reqwest::Client::new();
    let url = format!("{}/messages", config.base_url.trim_end_matches('/'));

    let request_body = AnthropicRequest {
        model: config.model.clone(),
        max_tokens: 4096,
        messages: vec![OpenAIMessage {
            role: "user".to_string(),
            content: prompt.to_string(),
        }],
        temperature: Some(temperature),
    };

    let response = client
        .post(&url)
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Anthropic: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Anthropic API returned error {}: {}", status, error_text));
    }

    let anthropic_response: AnthropicResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Anthropic response: {}", e))?;

    anthropic_response
        .content
        .first()
        .map(|c| c.text.trim().to_string())
        .ok_or_else(|| "No response from Anthropic".to_string())
}

pub async fn list_models(_config: &ProviderConfig) -> Result<Vec<String>, String> {
    Ok(vec![
        "claude-3-5-sonnet-latest".to_string(),
        "claude-3-5-haiku-latest".to_string(),
        "claude-3-opus-latest".to_string(),
        "claude-sonnet-4-20250514".to_string(),
        "claude-3-7-sonnet-20250219".to_string(),
    ])
}

pub async fn test_connection(config: &ProviderConfig) -> Result<bool, String> {
    let api_key = config.api_key.as_ref().ok_or("API key not configured")?;
    let client = reqwest::Client::new();
    let url = format!("{}/messages", config.base_url.trim_end_matches('/'));

    let request_body = AnthropicRequest {
        model: "claude-3-5-haiku-latest".to_string(),
        max_tokens: 10,
        messages: vec![OpenAIMessage {
            role: "user".to_string(),
            content: "Hi".to_string(),
        }],
        temperature: None,
    };

    let response = client
        .post(&url)
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    if response.status().is_success() {
        Ok(true)
    } else if response.status().as_u16() == 401 {
        Err("Invalid API key".to_string())
    } else {
        Err(format!("Server returned error: {}", response.status()))
    }
}
