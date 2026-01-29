use crate::llm::types::{
    OllamaGenerateRequest, OllamaGenerateResponse, OllamaOptions, OllamaTagsResponse, ProviderConfig,
};

#[allow(dead_code)]
pub async fn generate(config: &ProviderConfig, prompt: &str, temperature: f32) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = format!("{}/generate", config.base_url.trim_end_matches('/'));

    let request_body = OllamaGenerateRequest {
        model: config.model.clone(),
        prompt: prompt.to_string(),
        stream: false,
        options: Some(OllamaOptions { temperature }),
    };

    let response = client
        .post(&url)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama API returned error: {}", response.status()));
    }

    let ollama_response: OllamaGenerateResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Ollama response: {}", e))?;

    Ok(ollama_response.response.trim().to_string())
}

pub async fn list_models(config: &ProviderConfig) -> Result<Vec<String>, String> {
    let client = reqwest::Client::new();
    let url = format!("{}/tags", config.base_url.trim_end_matches('/'));

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch models: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Server returned error: {}", response.status()));
    }

    let tags_response: OllamaTagsResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(tags_response.models.into_iter().map(|m| m.name).collect())
}

pub async fn test_connection(config: &ProviderConfig) -> Result<bool, String> {
    let client = reqwest::Client::new();
    let url = format!("{}/tags", config.base_url.trim_end_matches('/'));

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    if response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Server returned error: {}", response.status()))
    }
}
