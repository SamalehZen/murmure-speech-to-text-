use crate::app_context;
use crate::llm::{self, AppPromptRule, LLMConnectSettings, LLMProvider, OllamaModel, ProviderConfig};
use tauri::{command, AppHandle, Emitter};

#[command]
pub fn get_llm_connect_settings(app: AppHandle) -> Result<LLMConnectSettings, String> {
    Ok(llm::load_llm_connect_settings(&app))
}

#[command]
pub fn set_llm_connect_settings(
    app: AppHandle,
    settings: LLMConnectSettings,
) -> Result<(), String> {
    llm::save_llm_connect_settings(&app, &settings)
}

#[command]
pub async fn test_llm_connection(url: String) -> Result<bool, String> {
    llm::test_ollama_connection(url).await
}

#[command]
pub async fn fetch_ollama_models(url: String) -> Result<Vec<OllamaModel>, String> {
    llm::fetch_ollama_models(url).await
}

#[command]
pub async fn fetch_provider_models(
    provider: LLMProvider,
    api_key: String,
    base_url: Option<String>,
) -> Result<Vec<String>, String> {
    llm::fetch_provider_models(provider, api_key, base_url).await
}

#[command]
pub async fn test_provider_connection(
    provider: LLMProvider,
    api_key: String,
    base_url: Option<String>,
) -> Result<bool, String> {
    llm::test_provider_connection(provider, api_key, base_url).await
}

#[command]
pub fn set_active_provider(app: AppHandle, provider: LLMProvider) -> Result<(), String> {
    let mut settings = llm::load_llm_connect_settings(&app);
    settings.active_provider = provider;
    llm::save_llm_connect_settings(&app, &settings)?;
    let _ = app.emit("llm-settings-updated", &settings);
    Ok(())
}

#[command]
pub fn save_provider_config(
    app: AppHandle,
    provider: LLMProvider,
    config: ProviderConfig,
) -> Result<(), String> {
    let mut settings = llm::load_llm_connect_settings(&app);
    let key = match provider {
        LLMProvider::Ollama => "ollama",
        LLMProvider::OpenAI => "openai",
        LLMProvider::Anthropic => "anthropic",
        LLMProvider::Google => "google",
        LLMProvider::OpenRouter => "openrouter",
    };
    settings.providers.insert(key.to_string(), config);
    llm::save_llm_connect_settings(&app, &settings)?;
    let _ = app.emit("llm-settings-updated", &settings);
    let _ = app.emit("provider-connection-status", ());
    Ok(())
}

#[command]
pub fn get_current_active_window() -> Result<app_context::ActiveWindowInfo, String> {
    app_context::get_active_window()
}

#[command]
pub fn save_app_rules(app: AppHandle, rules: Vec<AppPromptRule>) -> Result<(), String> {
    let mut settings = llm::load_llm_connect_settings(&app);
    settings.app_rules = rules;
    llm::save_llm_connect_settings(&app, &settings)?;
    let _ = app.emit("llm-settings-updated", &settings);
    Ok(())
}

#[command]
pub fn toggle_app_detection(app: AppHandle, enabled: bool) -> Result<(), String> {
    let mut settings = llm::load_llm_connect_settings(&app);
    settings.app_detection_enabled = enabled;
    llm::save_llm_connect_settings(&app, &settings)?;
    let _ = app.emit("llm-settings-updated", &settings);
    Ok(())
}

#[command]
pub fn test_app_rule(rule: AppPromptRule) -> Result<bool, String> {
    let window_info = app_context::get_active_window()?;
    
    let matches = match rule.match_type {
        llm::AppMatchType::AppNameContains => window_info
            .app_name
            .to_lowercase()
            .contains(&rule.match_pattern.to_lowercase()),
        llm::AppMatchType::WindowTitleContains => window_info
            .window_title
            .to_lowercase()
            .contains(&rule.match_pattern.to_lowercase()),
        llm::AppMatchType::ProcessNameEquals => {
            window_info.process_name.to_lowercase() == rule.match_pattern.to_lowercase()
        }
        llm::AppMatchType::WindowTitleRegex => regex::Regex::new(&rule.match_pattern)
            .map(|r| r.is_match(&window_info.window_title))
            .unwrap_or(false),
        llm::AppMatchType::UrlContains => window_info
            .url
            .as_ref()
            .map(|url| url.to_lowercase().contains(&rule.match_pattern.to_lowercase()))
            .unwrap_or(false),
        llm::AppMatchType::BundleIdEquals => window_info
            .bundle_id
            .as_ref()
            .map(|bid| bid.to_lowercase() == rule.match_pattern.to_lowercase())
            .unwrap_or(false),
    };
    
    Ok(matches)
}
