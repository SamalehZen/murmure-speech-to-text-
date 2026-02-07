use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(default)]
pub struct LLMConnectSettings {
    pub url: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub model: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub prompt: String,
    pub modes: Vec<LLMMode>,
    pub active_mode_index: usize,
    pub onboarding_completed: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LLMMode {
    pub name: String,
    pub prompt: String,
    pub model: String,
    pub shortcut: String,
}

impl Default for LLMConnectSettings {
    fn default() -> Self {
        Self {
            url: "http://localhost:11434/api".to_string(),
            model: String::new(),
            prompt: String::new(),
            modes: Vec::new(),
            active_mode_index: 0,
            onboarding_completed: false,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Tone {
    pub id: String,
    pub name: String,
    pub prompt: String,
    pub model: String,
    pub is_system: bool,
    pub icon: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type")]
pub enum AppMatcher {
    #[serde(rename = "app")]
    App {
        app_name: String,
        process_name: Option<String>,
    },
    #[serde(rename = "domain")]
    Domain { pattern: String },
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RegisteredApp {
    pub id: String,
    pub matcher: AppMatcher,
    pub tone_id: String,
    pub display_name: String,
    pub icon: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(default)]
pub struct TonesSettings {
    pub tones: Vec<Tone>,
    pub registered_apps: Vec<RegisteredApp>,
    pub default_tone_id: Option<String>,
    pub manual_override_tone_id: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OllamaGenerateRequest {
    pub model: String,
    pub prompt: String,
    pub stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<OllamaOptions>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OllamaOptions {
    pub temperature: f32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OllamaGenerateResponse {
    pub response: String,
    pub done: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OllamaTagsResponse {
    pub models: Vec<OllamaModel>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OllamaModel {
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OllamaPullRequest {
    pub model: String,
    pub stream: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct OllamaPullResponse {
    pub status: String,
    pub digest: Option<String>,
    pub total: Option<u64>,
    pub completed: Option<u64>,
}
