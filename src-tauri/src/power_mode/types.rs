use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TriggerMatchType {
    AppNameContains,
    WindowTitleContains,
    ProcessNameEquals,
    WindowTitleRegex,
    UrlContains,
    UrlRegex,
    UrlDomainEquals,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TriggerRule {
    pub id: String,
    pub name: String,
    pub match_type: TriggerMatchType,
    pub pattern: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PowerModeConfig {
    pub id: String,
    pub name: String,
    pub emoji: String,
    pub is_enabled: bool,
    pub priority: i32,
    pub triggers: Vec<TriggerRule>,
    pub is_ai_enhancement_enabled: bool,
    pub selected_ai_provider: Option<String>,
    pub selected_ai_model: Option<String>,
    pub prompt_template: String,
    pub use_screen_capture: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PowerModeSession {
    pub active_power_mode_id: Option<String>,
    pub original_state: OriginalLLMState,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct OriginalLLMState {
    pub active_provider: Option<String>,
    pub active_model: Option<String>,
    pub prompt_template: Option<String>,
    pub is_ai_enhancement_enabled: Option<bool>,
    pub use_screen_capture: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledApp {
    pub name: String,
    pub executable_path: String,
    pub executable_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PowerModeSettings {
    pub power_modes: Vec<PowerModeConfig>,
    pub is_power_mode_enabled: bool,
}
