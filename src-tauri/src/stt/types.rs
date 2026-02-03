use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fmt;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash, Default)]
#[serde(rename_all = "lowercase")]
pub enum STTProvider {
    #[default]
    Offline,
    OpenAI,
    Google,
    Groq,
}

impl fmt::Display for STTProvider {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            STTProvider::Offline => write!(f, "offline"),
            STTProvider::OpenAI => write!(f, "openai"),
            STTProvider::Google => write!(f, "google"),
            STTProvider::Groq => write!(f, "groq"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct STTProviderConfig {
    pub provider: STTProvider,
    pub api_key: Option<String>,
    pub base_url: String,
    pub model: String,
    pub available_models: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct STTSettings {
    pub active_provider: STTProvider,
    pub providers: HashMap<String, STTProviderConfig>,
}

impl Default for STTSettings {
    fn default() -> Self {
        let mut providers = HashMap::new();
        providers.insert(
            "offline".to_string(),
            STTProviderConfig {
                provider: STTProvider::Offline,
                api_key: None,
                base_url: String::new(),
                model: "parakeet-tdt-0.6b-v3-int8".to_string(),
                available_models: vec!["parakeet-tdt-0.6b-v3-int8".to_string()],
            },
        );
        providers.insert(
            "openai".to_string(),
            STTProviderConfig {
                provider: STTProvider::OpenAI,
                api_key: None,
                base_url: "https://api.openai.com/v1".to_string(),
                model: "whisper-1".to_string(),
                available_models: Vec::new(),
            },
        );
        providers.insert(
            "google".to_string(),
            STTProviderConfig {
                provider: STTProvider::Google,
                api_key: None,
                base_url: "https://generativelanguage.googleapis.com/v1beta".to_string(),
                model: "gemini-2.0-flash".to_string(),
                available_models: Vec::new(),
            },
        );
        providers.insert(
            "groq".to_string(),
            STTProviderConfig {
                provider: STTProvider::Groq,
                api_key: None,
                base_url: "https://api.groq.com/openai/v1".to_string(),
                model: "whisper-large-v3".to_string(),
                available_models: Vec::new(),
            },
        );

        Self {
            active_provider: STTProvider::Offline,
            providers,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct WhisperResponse {
    pub text: String,
}

#[derive(Debug, Deserialize)]
pub struct OpenAIModelsResponse {
    pub data: Vec<OpenAIModelInfo>,
}

#[derive(Debug, Deserialize)]
pub struct OpenAIModelInfo {
    pub id: String,
}

#[derive(Debug, Serialize)]
pub struct GoogleAudioRequest {
    pub contents: Vec<GoogleAudioContent>,
}

#[derive(Debug, Serialize)]
pub struct GoogleAudioContent {
    pub parts: Vec<GoogleAudioPart>,
}

#[derive(Debug, Serialize)]
#[serde(untagged)]
pub enum GoogleAudioPart {
    Text { text: String },
    InlineData { inline_data: GoogleInlineData },
}

#[derive(Debug, Serialize)]
pub struct GoogleInlineData {
    pub mime_type: String,
    pub data: String,
}

#[derive(Debug, Deserialize)]
pub struct GoogleAudioResponse {
    pub candidates: Option<Vec<GoogleCandidate>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GoogleCandidate {
    pub content: GoogleResponseContent,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GoogleResponseContent {
    pub parts: Vec<GoogleResponsePart>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GoogleResponsePart {
    pub text: String,
}

#[derive(Debug, Deserialize)]
pub struct GoogleModelsResponse {
    pub models: Vec<GoogleModelInfo>,
}

#[derive(Debug, Deserialize)]
pub struct GoogleModelInfo {
    pub name: String,
}
