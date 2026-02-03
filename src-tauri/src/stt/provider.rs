use std::path::Path;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum STTError {
    #[error("API key not configured")]
    ApiKeyMissing,
    #[error("Connection failed: {0}")]
    ConnectionFailed(String),
    #[error("API error {status}: {message}")]
    ApiError { status: u16, message: String },
    #[error("Invalid response: {0}")]
    InvalidResponse(String),
    #[error("Unsupported audio format: {0}")]
    UnsupportedFormat(String),
    #[error("File read error: {0}")]
    FileReadError(String),
    #[error("Provider not available: {0}")]
    ProviderNotAvailable(String),
}

impl From<STTError> for String {
    fn from(err: STTError) -> Self {
        err.to_string()
    }
}

pub fn get_mime_type(format: &str) -> Result<&'static str, STTError> {
    match format.to_lowercase().as_str() {
        "wav" => Ok("audio/wav"),
        "mp3" => Ok("audio/mpeg"),
        "m4a" => Ok("audio/mp4"),
        "webm" => Ok("audio/webm"),
        "ogg" | "oga" => Ok("audio/ogg"),
        "flac" => Ok("audio/flac"),
        "mp4" => Ok("audio/mp4"),
        "mpga" | "mpeg" => Ok("audio/mpeg"),
        _ => Err(STTError::UnsupportedFormat(format.to_string())),
    }
}

pub fn get_format_from_path(path: &Path) -> Result<String, STTError> {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|s| s.to_lowercase())
        .ok_or_else(|| STTError::UnsupportedFormat("unknown".to_string()))
}
