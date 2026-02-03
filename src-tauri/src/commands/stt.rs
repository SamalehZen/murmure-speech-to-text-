use crate::stt::{
    self, providers, STTProvider, STTProviderConfig, STTSettings, GEMINI_AUDIO_MODELS,
    GROQ_WHISPER_MODELS, OPENAI_WHISPER_MODELS,
};
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
pub async fn test_stt_connection(
    provider: STTProvider,
    config: STTProviderConfig,
) -> Result<bool, String> {
    match provider {
        STTProvider::Parakeet => Ok(true),
        STTProvider::OpenAI => providers::openai::test_connection(&config)
            .await
            .map_err(|e| e.to_string()),
        STTProvider::Groq => providers::groq::test_connection(&config)
            .await
            .map_err(|e| e.to_string()),
        STTProvider::Gemini => providers::gemini::test_connection(&config)
            .await
            .map_err(|e| e.to_string()),
    }
}

#[command]
pub fn get_available_stt_models(provider: STTProvider) -> Result<Vec<String>, String> {
    let models = match provider {
        STTProvider::Parakeet => vec!["parakeet-tdt-0.6b"],
        STTProvider::OpenAI => OPENAI_WHISPER_MODELS.to_vec(),
        STTProvider::Groq => GROQ_WHISPER_MODELS.to_vec(),
        STTProvider::Gemini => GEMINI_AUDIO_MODELS.to_vec(),
    };
    Ok(models.into_iter().map(String::from).collect())
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
    provider: STTProvider,
    config: STTProviderConfig,
) -> Result<(), String> {
    let mut settings = stt::load_stt_settings(&app);
    settings.providers.insert(provider.key().to_string(), config);
    stt::save_stt_settings(&app, &settings)?;
    let _ = app.emit("stt-settings-updated", &settings);
    let _ = app.emit("stt-provider-connection-status", ());
    Ok(())
}

#[command]
pub fn set_parakeet_downloaded(app: AppHandle, downloaded: bool) -> Result<(), String> {
    let mut settings = stt::load_stt_settings(&app);
    settings.parakeet_downloaded = downloaded;
    stt::save_stt_settings(&app, &settings)?;
    let _ = app.emit("stt-settings-updated", &settings);
    Ok(())
}
