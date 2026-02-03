use crate::stt::provider::{get_format_from_path, get_mime_type, STTError};
use crate::stt::types::{
    GeminiAudioRequest, GeminiAudioResponse, GeminiContent, GeminiInlineData, GeminiPart,
    STTProviderConfig,
};
use base64::Engine;
use std::path::Path;

const DEFAULT_BASE_URL: &str = "https://generativelanguage.googleapis.com/v1beta";
const TRANSCRIPTION_PROMPT: &str = "Transcribe this audio accurately. Return only the transcription text, nothing else.";

pub async fn transcribe(config: &STTProviderConfig, audio_path: &Path) -> Result<String, STTError> {
    let audio_data = std::fs::read(audio_path)
        .map_err(|e| STTError::FileReadError(e.to_string()))?;
    let format = get_format_from_path(audio_path)?;
    transcribe_bytes(config, &audio_data, &format).await
}

pub async fn transcribe_bytes(
    config: &STTProviderConfig,
    audio_data: &[u8],
    format: &str,
) -> Result<String, STTError> {
    let api_key = config.api_key.as_ref().ok_or(STTError::ApiKeyMissing)?;
    let base_url = config
        .base_url
        .as_deref()
        .unwrap_or(DEFAULT_BASE_URL)
        .trim_end_matches('/');

    let url = format!(
        "{}/models/{}:generateContent?key={}",
        base_url, config.model, api_key
    );

    let mime_type = get_mime_type(format)?;
    let audio_base64 = base64::engine::general_purpose::STANDARD.encode(audio_data);

    let request_body = GeminiAudioRequest {
        contents: vec![GeminiContent {
            parts: vec![
                GeminiPart::Text {
                    text: TRANSCRIPTION_PROMPT.to_string(),
                },
                GeminiPart::InlineData {
                    inline_data: GeminiInlineData {
                        mime_type: mime_type.to_string(),
                        data: audio_base64,
                    },
                },
            ],
        }],
    };

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| STTError::ConnectionFailed(e.to_string()))?;

    if !response.status().is_success() {
        let status = response.status().as_u16();
        let error_text = response.text().await.unwrap_or_default();
        return Err(STTError::ApiError {
            status,
            message: error_text,
        });
    }

    let gemini_response: GeminiAudioResponse = response
        .json()
        .await
        .map_err(|e| STTError::InvalidResponse(e.to_string()))?;

    gemini_response
        .candidates
        .and_then(|c| c.first().cloned())
        .and_then(|c| c.content.parts.first().cloned())
        .map(|p| p.text.trim().to_string())
        .ok_or_else(|| STTError::InvalidResponse("No transcription in response".to_string()))
}

pub async fn test_connection(config: &STTProviderConfig) -> Result<bool, STTError> {
    let api_key = config.api_key.as_ref().ok_or(STTError::ApiKeyMissing)?;
    let base_url = config
        .base_url
        .as_deref()
        .unwrap_or(DEFAULT_BASE_URL)
        .trim_end_matches('/');

    let url = format!("{}/models?key={}", base_url, api_key);

    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| STTError::ConnectionFailed(e.to_string()))?;

    match response.status().as_u16() {
        200..=299 => Ok(true),
        400 | 403 => Err(STTError::ApiError {
            status: response.status().as_u16(),
            message: "Invalid API key".to_string(),
        }),
        status => Err(STTError::ApiError {
            status,
            message: format!("Server returned error: {}", status),
        }),
    }
}

pub fn supported_formats() -> Vec<&'static str> {
    vec!["wav", "mp3", "m4a", "webm", "ogg", "flac"]
}
