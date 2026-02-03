use crate::stt::provider::{get_format_from_path, get_mime_type, STTError};
use crate::stt::types::{STTProviderConfig, WhisperTranscriptionResponse};
use reqwest::multipart::{Form, Part};
use std::path::Path;

const DEFAULT_BASE_URL: &str = "https://api.openai.com/v1";

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

    let url = format!("{}/audio/transcriptions", base_url);
    let mime_type = get_mime_type(format)?;
    let filename = format!("audio.{}", format);

    let file_part = Part::bytes(audio_data.to_vec())
        .file_name(filename)
        .mime_str(mime_type)
        .map_err(|e| STTError::InvalidResponse(e.to_string()))?;

    let form = Form::new()
        .part("file", file_part)
        .text("model", config.model.clone())
        .text("response_format", "json");

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
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

    let transcription: WhisperTranscriptionResponse = response
        .json()
        .await
        .map_err(|e| STTError::InvalidResponse(e.to_string()))?;

    Ok(transcription.text.trim().to_string())
}

pub async fn test_connection(config: &STTProviderConfig) -> Result<bool, STTError> {
    let api_key = config.api_key.as_ref().ok_or(STTError::ApiKeyMissing)?;
    let base_url = config
        .base_url
        .as_deref()
        .unwrap_or(DEFAULT_BASE_URL)
        .trim_end_matches('/');

    let url = format!("{}/models", base_url);

    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| STTError::ConnectionFailed(e.to_string()))?;

    match response.status().as_u16() {
        200..=299 => Ok(true),
        401 => Err(STTError::ApiError {
            status: 401,
            message: "Invalid API key".to_string(),
        }),
        status => Err(STTError::ApiError {
            status,
            message: format!("Server returned error: {}", status),
        }),
    }
}

pub fn supported_formats() -> Vec<&'static str> {
    vec!["wav", "mp3", "m4a", "webm", "mp4", "mpga", "mpeg", "oga", "ogg", "flac"]
}
