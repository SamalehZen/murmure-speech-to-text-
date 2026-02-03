use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum STTProvider {
    Parakeet,
    OpenAI,
    Groq,
    Gemini,
}

impl Default for STTProvider {
    fn default() -> Self {
        STTProvider::Gemini
    }
}

impl STTProvider {
    pub fn key(&self) -> &'static str {
        match self {
            STTProvider::Parakeet => "parakeet",
            STTProvider::OpenAI => "openai",
            STTProvider::Groq => "groq",
            STTProvider::Gemini => "gemini",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct STTProviderConfig {
    pub provider: STTProvider,
    pub api_key: Option<String>,
    pub model: String,
    pub base_url: Option<String>,
}

impl Default for STTProviderConfig {
    fn default() -> Self {
        Self {
            provider: STTProvider::Gemini,
            api_key: None,
            model: String::new(),
            base_url: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct STTSettings {
    pub active_provider: STTProvider,
    pub providers: HashMap<String, STTProviderConfig>,
    pub parakeet_downloaded: bool,
}

impl Default for STTSettings {
    fn default() -> Self {
        let mut providers = HashMap::new();

        providers.insert(
            "parakeet".to_string(),
            STTProviderConfig {
                provider: STTProvider::Parakeet,
                api_key: None,
                model: "parakeet-tdt-0.6b".to_string(),
                base_url: None,
            },
        );

        providers.insert(
            "openai".to_string(),
            STTProviderConfig {
                provider: STTProvider::OpenAI,
                api_key: None,
                model: "whisper-1".to_string(),
                base_url: Some("https://api.openai.com/v1".to_string()),
            },
        );

        providers.insert(
            "groq".to_string(),
            STTProviderConfig {
                provider: STTProvider::Groq,
                api_key: None,
                model: "whisper-large-v3-turbo".to_string(),
                base_url: Some("https://api.groq.com/openai/v1".to_string()),
            },
        );

        providers.insert(
            "gemini".to_string(),
            STTProviderConfig {
                provider: STTProvider::Gemini,
                api_key: None,
                model: "gemini-2.0-flash-lite".to_string(),
                base_url: Some("https://generativelanguage.googleapis.com/v1beta".to_string()),
            },
        );

        Self {
            active_provider: STTProvider::Gemini,
            providers,
            parakeet_downloaded: false,
        }
    }
}

pub const OPENAI_WHISPER_MODELS: &[&str] = &["whisper-1"];

pub const GROQ_WHISPER_MODELS: &[&str] = &[
    "whisper-large-v3",
    "whisper-large-v3-turbo",
    "distil-whisper-large-v3-en",
];

pub const GEMINI_AUDIO_MODELS: &[&str] = &[
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
];

pub const SUPPORTED_AUDIO_FORMATS: &[&str] = &["wav", "mp3", "m4a", "webm", "ogg", "flac", "mp4", "mpga", "mpeg", "oga"];

#[derive(Debug, Deserialize)]
pub struct WhisperTranscriptionResponse {
    pub text: String,
}

#[derive(Debug, Serialize)]
pub struct GeminiAudioRequest {
    pub contents: Vec<GeminiContent>,
}

#[derive(Debug, Serialize)]
pub struct GeminiContent {
    pub parts: Vec<GeminiPart>,
}

#[derive(Debug, Serialize)]
#[serde(untagged)]
pub enum GeminiPart {
    Text { text: String },
    InlineData { inline_data: GeminiInlineData },
}

#[derive(Debug, Serialize)]
pub struct GeminiInlineData {
    pub mime_type: String,
    pub data: String,
}

#[derive(Debug, Deserialize)]
pub struct GeminiAudioResponse {
    pub candidates: Option<Vec<GeminiCandidate>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GeminiCandidate {
    pub content: GeminiResponseContent,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GeminiResponseContent {
    pub parts: Vec<GeminiResponsePart>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GeminiResponsePart {
    pub text: String,
}
