use crate::stt::{self, STTProvider, STTProviderConfig, STTSettings};
use tauri::{command, AppHandle, Emitter};

#[command]
pub fn get_stt_settings(app: AppHandle) -> Result<STTSettings, String> {
    Ok(stt::load_stt_settings(&app))
}

#[command]
pub fn save_stt_settings(app: AppHandle, settings: STTSettings) -> Result<(), String> {
    stt::save_stt_settings(&app, &settings)?;
    let _ = app.emit("stt-settings-updated", &settings);
    Ok(())
}

#[command]
pub fn set_active_stt_provider(app: AppHandle, provider: STTProvider) -> Result<(), String> {
    let mut settings = stt::load_stt_settings(&app);
    settings.active_provider = provider;
    stt::save_stt_settings(&app, &settings)?;
    let _ = app.emit("stt-settings-updated", &settings);
    Ok(())
}

#[command]
pub fn save_stt_provider_config(
    app: AppHandle,
    provider: String,
    config: STTProviderConfig,
) -> Result<(), String> {
    let mut settings = stt::load_stt_settings(&app);
    settings.providers.insert(provider, config);
    stt::save_stt_settings(&app, &settings)?;
    let _ = app.emit("stt-settings-updated", &settings);
    let _ = app.emit("stt-provider-connection-status", ());
    Ok(())
}

#[command]
pub async fn test_stt_connection(app: AppHandle, provider: String) -> Result<bool, String> {
    let settings = stt::load_stt_settings(&app);
    let config = settings
        .providers
        .get(&provider)
        .ok_or_else(|| format!("Provider '{}' not found", provider))?;

    match config.provider {
        STTProvider::Offline => Ok(true),
        STTProvider::OpenAI => stt::providers::openai::test_connection(config).await,
        STTProvider::Google => stt::providers::google::test_connection(config).await,
        STTProvider::Groq => stt::providers::groq::test_connection(config).await,
    }
}

#[command]
pub async fn fetch_stt_models(app: AppHandle, provider: String) -> Result<Vec<String>, String> {
    let settings = stt::load_stt_settings(&app);
    let config = settings
        .providers
        .get(&provider)
        .ok_or_else(|| format!("Provider '{}' not found", provider))?;

    match config.provider {
        STTProvider::Offline => Ok(vec!["parakeet-tdt-0.6b-v3-int8".to_string()]),
        STTProvider::OpenAI => stt::providers::openai::list_models(config).await,
        STTProvider::Google => stt::providers::google::list_models(config).await,
        STTProvider::Groq => stt::providers::groq::list_models(config).await,
    }
}
