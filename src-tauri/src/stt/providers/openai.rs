use crate::stt::types::{OpenAIModelsResponse, STTProviderConfig, WhisperResponse};
use reqwest::multipart;
use std::path::Path;

pub async fn transcribe(config: &STTProviderConfig, audio_path: &Path) -> Result<String, String> {
    let api_key = config.api_key.as_ref().ok_or("API key not configured")?;
    let client = reqwest::Client::new();

    let file_bytes =
        std::fs::read(audio_path).map_err(|e| format!("Failed to read audio file: {}", e))?;

    let file_name = audio_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("audio.wav")
        .to_string();

    let file_part = multipart::Part::bytes(file_bytes)
        .file_name(file_name)
        .mime_str("audio/wav")
        .map_err(|e| format!("Failed to create multipart: {}", e))?;

    let form = multipart::Form::new()
        .text("model", config.model.clone())
        .part("file", file_part);

    let url = format!(
        "{}/audio/transcriptions",
        config.base_url.trim_end_matches('/')
    );

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to OpenAI: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("OpenAI API error {}: {}", status, error_text));
    }

    let result: WhisperResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(result.text)
}

pub async fn list_models(config: &STTProviderConfig) -> Result<Vec<String>, String> {
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

    let models_response: OpenAIModelsResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let models: Vec<String> = models_response
        .data
        .into_iter()
        .filter(|m| m.id.contains("whisper"))
        .map(|m| m.id)
        .collect();

    Ok(models)
}

pub async fn test_connection(config: &STTProviderConfig) -> Result<bool, String> {
    let api_key = config.api_key.as_ref().ok_or("API key not configured")?;
    let client = reqwest::Client::new();
    let url = format!("{}/models", config.base_url.trim_end_matches('/'));

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    match response.status().as_u16() {
        200..=299 => Ok(true),
        401 => Err("Invalid API key".to_string()),
        _ => Err(format!("Server error: {}", response.status())),
    }
}
