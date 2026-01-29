use crate::llm::types::{
    OpenAIChatRequest, OpenAIChatResponse, OpenAIMessage, ProviderConfig,
};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct OpenRouterModelsResponse {
    data: Vec<OpenRouterModel>,
}

#[derive(Debug, Deserialize)]
struct OpenRouterModel {
    id: String,
}

#[allow(dead_code)]
pub async fn generate(config: &ProviderConfig, prompt: &str, temperature: f32) -> Result<String, String> {
    let api_key = config.api_key.as_ref().ok_or("API key not configured")?;
    let client = reqwest::Client::new();
    let url = format!("{}/chat/completions", config.base_url.trim_end_matches('/'));

    let request_body = OpenAIChatRequest {
        model: config.model.clone(),
        messages: vec![OpenAIMessage {
            role: "user".to_string(),
            content: prompt.to_string(),
        }],
        temperature: Some(temperature),
        max_tokens: Some(4096),
    };

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .header("HTTP-Referer", "https://murmure.app")
        .header("X-Title", "Murmure")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to OpenRouter: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("OpenRouter API returned error {}: {}", status, error_text));
    }

    let openrouter_response: OpenAIChatResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse OpenRouter response: {}", e))?;

    openrouter_response
        .choices
        .first()
        .map(|c| c.message.content.trim().to_string())
        .ok_or_else(|| "No response from OpenRouter".to_string())
}

pub async fn list_models(config: &ProviderConfig) -> Result<Vec<String>, String> {
    let api_key = config.api_key.as_ref().ok_or("API key not configured")?;
    let client = reqwest::Client::new();
    let url = format!("{}/models", config.base_url.trim_end_matches('/'));

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| format!("Failed to fetch models: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Server returned error: {}", response.status()));
    }

    let models_response: OpenRouterModelsResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let models: Vec<String> = models_response
        .data
        .into_iter()
        .map(|m| m.id)
        .collect();

    Ok(models)
}

pub async fn test_connection(config: &ProviderConfig) -> Result<bool, String> {
    let api_key = config.api_key.as_ref().ok_or("API key not configured")?;
    let client = reqwest::Client::new();
    let url = format!("{}/models", config.base_url.trim_end_matches('/'));

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
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
