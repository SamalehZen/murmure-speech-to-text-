use crate::app_context;
use crate::llm::{
    self, AppPromptRule, LLMConnectSettings, LLMProvider, OllamaModel, ProviderConfig, ToneConfig,
};
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
    app_context::invalidate_window_cache();
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
    app_context::invalidate_window_cache();
    let window_info = app_context::get_active_window()?;
    Ok(app_context::rule_matches(&window_info, &rule))
}

#[command]
pub fn find_matching_rule(app: AppHandle) -> Result<Option<String>, String> {
    app_context::invalidate_window_cache();
    let window_info = app_context::get_active_window()?;
    let settings = llm::load_llm_connect_settings(&app);
    
    match app_context::find_best_matching_rule(&settings.app_rules, &window_info) {
        Some(rule) => Ok(Some(rule.name.clone())),
        None => Ok(None),
    }
}

#[command]
pub fn get_tones(app: AppHandle) -> Vec<ToneConfig> {
    let settings = llm::load_llm_connect_settings(&app);
    if settings.tones.is_empty() {
        ToneConfig::default_tones()
    } else {
        settings.tones
    }
}

#[command]
pub fn set_tones(app: AppHandle, tones: Vec<ToneConfig>) -> Result<(), String> {
    let mut settings = llm::load_llm_connect_settings(&app);
    settings.tones = tones;
    llm::save_llm_connect_settings(&app, &settings)?;
    let _ = app.emit("llm-settings-updated", &settings);
    Ok(())
}

#[command]
pub fn set_app_tone_override(
    app: AppHandle,
    app_name: String,
    tone_id: String,
) -> Result<(), String> {
    let mut settings = llm::load_llm_connect_settings(&app);
    if tone_id.is_empty() {
        settings.app_tone_overrides.remove(&app_name);
    } else {
        settings.app_tone_overrides.insert(app_name, tone_id);
    }
    llm::save_llm_connect_settings(&app, &settings)?;
    let _ = app.emit("llm-settings-updated", &settings);
    Ok(())
}

#[command]
pub fn set_default_tone(app: AppHandle, tone_id: Option<String>) -> Result<(), String> {
    let mut settings = llm::load_llm_connect_settings(&app);
    settings.default_tone_id = tone_id;
    llm::save_llm_connect_settings(&app, &settings)?;
    let _ = app.emit("llm-settings-updated", &settings);
    Ok(())
}

#[command]
pub fn get_tone_for_app(app: AppHandle, detected_app: String) -> Option<ToneConfig> {
    let settings = llm::load_llm_connect_settings(&app);
    let tones = if settings.tones.is_empty() {
        ToneConfig::default_tones()
    } else {
        settings.tones.clone()
    };

    if let Some(tone_id) = settings.app_tone_overrides.get(&detected_app) {
        return tones.iter().find(|t| &t.id == tone_id).cloned();
    }

    for tone in &tones {
        if tone.apps.contains(&detected_app) {
            return Some(tone.clone());
        }
    }

    settings
        .default_tone_id
        .as_ref()
        .and_then(|id| tones.iter().find(|t| &t.id == id).cloned())
}
