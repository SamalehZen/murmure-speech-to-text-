use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudAuthState {
    pub is_authenticated: bool,
    pub user: Option<CloudUser>,
    pub token: Option<String>,
    pub backend_url: Option<String>,
}

impl Default for CloudAuthState {
    fn default() -> Self {
        Self {
            is_authenticated: false,
            user: None,
            token: None,
            backend_url: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudUser {
    pub id: String,
    pub email: String,
    pub name: Option<String>,
    pub role: String,
    pub plan: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: CloudUser,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GlobalConfig {
    pub shortcuts: Vec<ShortcutConfig>,
    pub llm_settings: LLMSettings,
    pub dictionary: Vec<DictionaryEntry>,
    pub formatting_rules: Vec<FormattingRule>,
    pub app_prompts: Vec<AppPrompt>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShortcutConfig {
    pub id: String,
    pub action: String,
    pub keys: Vec<String>,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LLMSettings {
    pub default_provider: String,
    pub fallback_order: Vec<String>,
    pub providers: LLMProviders,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LLMProviders {
    pub openai: Option<ProviderConfig>,
    pub anthropic: Option<ProviderConfig>,
    pub google: Option<ProviderConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderConfig {
    pub enabled: bool,
    pub model: String,
    pub temperature: f32,
    pub max_tokens: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DictionaryEntry {
    pub id: String,
    pub spoken: String,
    pub written: String,
    pub category: String,
    pub case_sensitive: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormattingRule {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub rule_type: String,
    pub enabled: bool,
    pub order: i32,
    pub config: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppPrompt {
    pub id: String,
    pub app_name: String,
    pub process_names: Vec<String>,
    pub window_title_contains: Option<String>,
    pub system_prompt: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncStatus {
    pub last_sync: Option<String>,
    pub config_hash: Option<String>,
    pub is_syncing: bool,
    pub error: Option<String>,
}

impl Default for SyncStatus {
    fn default() -> Self {
        Self {
            last_sync: None,
            config_hash: None,
            is_syncing: false,
            error: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudSyncState {
    pub auth: CloudAuthState,
    pub sync_status: SyncStatus,
    pub cached_config: Option<GlobalConfig>,
}

impl Default for CloudSyncState {
    fn default() -> Self {
        Self {
            auth: CloudAuthState::default(),
            sync_status: SyncStatus::default(),
            cached_config: None,
        }
    }
}
