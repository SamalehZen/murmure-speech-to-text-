use crate::llm::types::{
    GoogleContent, GoogleGenerateRequest, GoogleGenerateResponse, GoogleGenerationConfig,
    GoogleModelsResponse, GooglePart, ProviderConfig,
};

pub async fn generate(config: &ProviderConfig, prompt: &str, temperature: f32) -> Result<String, String> {
    let api_key = config.api_key.as_ref().ok_or("API key not configured")?;
    let client = reqwest::Client::new();
    let url = format!(
        "{}/models/{}:generateContent?key={}",
        config.base_url.trim_end_matches('/'),
        config.model,
        api_key
    );

    let request_body = GoogleGenerateRequest {
        contents: vec![GoogleContent {
            parts: vec![GooglePart {
                text: prompt.to_string(),
            }],
        }],
        generation_config: Some(GoogleGenerationConfig {
            temperature: Some(temperature),
            max_output_tokens: Some(8192),
        }),
    };

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Google AI: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Google AI API returned error {}: {}", status, error_text));
    }

    let google_response: GoogleGenerateResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Google AI response: {}", e))?;

    google_response
        .candidates
        .and_then(|c| c.first().cloned())
        .and_then(|c| c.content.parts.first().cloned())
        .map(|p| p.text.trim().to_string())
        .ok_or_else(|| "No response from Google AI".to_string())
}

pub async fn list_models(config: &ProviderConfig) -> Result<Vec<String>, String> {
    let api_key = config.api_key.as_ref().ok_or("API key not configured")?;
    let client = reqwest::Client::new();
    let url = format!(
        "{}/models?key={}",
        config.base_url.trim_end_matches('/'),
        api_key
    );

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch models: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Server returned error: {}", response.status()));
    }

    let models_response: GoogleModelsResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let models: Vec<String> = models_response
        .models
        .into_iter()
        .filter(|m| m.name.contains("gemini"))
        .map(|m| m.name.replace("models/", ""))
        .collect();

    Ok(models)
}

pub async fn test_connection(config: &ProviderConfig) -> Result<bool, String> {
    let api_key = config.api_key.as_ref().ok_or("API key not configured")?;
    let client = reqwest::Client::new();
    let url = format!(
        "{}/models?key={}",
        config.base_url.trim_end_matches('/'),
        api_key
    );

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    if response.status().is_success() {
        Ok(true)
    } else if response.status().as_u16() == 400 || response.status().as_u16() == 403 {
        Err("Invalid API key".to_string())
    } else {
        Err(format!("Server returned error: {}", response.status()))
    }
}
