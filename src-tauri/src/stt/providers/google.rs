use crate::stt::types::{
    GoogleAudioContent, GoogleAudioPart, GoogleAudioRequest, GoogleAudioResponse, GoogleInlineData,
    GoogleModelsResponse, STTProviderConfig,
};
use base64::{engine::general_purpose::STANDARD, Engine};
use std::path::Path;

pub async fn transcribe(config: &STTProviderConfig, audio_path: &Path) -> Result<String, String> {
    let api_key = config.api_key.as_ref().ok_or("API key not configured")?;
    let client = reqwest::Client::new();

    let file_bytes =
        std::fs::read(audio_path).map_err(|e| format!("Failed to read audio file: {}", e))?;

    let base64_audio = STANDARD.encode(&file_bytes);

    let request_body = GoogleAudioRequest {
        contents: vec![GoogleAudioContent {
            parts: vec![
                GoogleAudioPart::Text {
                    text: "Transcribe this audio. Return only the transcription text without any additional commentary or formatting.".to_string(),
                },
                GoogleAudioPart::InlineData {
                    inline_data: GoogleInlineData {
                        mime_type: "audio/wav".to_string(),
                        data: base64_audio,
                    },
                },
            ],
        }],
    };

    let url = format!(
        "{}/models/{}:generateContent?key={}",
        config.base_url.trim_end_matches('/'),
        config.model,
        api_key
    );

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
        return Err(format!("Google AI API error {}: {}", status, error_text));
    }

    let google_response: GoogleAudioResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    google_response
        .candidates
        .and_then(|c| c.first().cloned())
        .and_then(|c| c.content.parts.first().cloned())
        .map(|p| p.text.trim().to_string())
        .ok_or_else(|| "No response from Google AI".to_string())
}

pub async fn list_models(config: &STTProviderConfig) -> Result<Vec<String>, String> {
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

pub async fn test_connection(config: &STTProviderConfig) -> Result<bool, String> {
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

    match response.status().as_u16() {
        200..=299 => Ok(true),
        400 | 403 => Err("Invalid API key".to_string()),
        _ => Err(format!("Server error: {}", response.status())),
    }
}
