use crate::settings::{self, CloudSttConfig, CloudSttProvider, InitialSetupState, SttMode};
use tauri::{command, AppHandle};

#[command]
pub fn is_initial_setup_completed(app: AppHandle) -> bool {
    let s = settings::load_settings(&app);
    s.initial_setup.completed
}

#[command]
pub fn get_initial_setup_state(app: AppHandle) -> InitialSetupState {
    let s = settings::load_settings(&app);
    s.initial_setup
}

#[command]
pub fn complete_initial_setup(
    app: AppHandle,
    stt_mode: String,
    cloud_provider: Option<String>,
    cloud_api_key: Option<String>,
    cloud_model: Option<String>,
) -> Result<(), String> {
    let mut s = settings::load_settings(&app);

    let mode = match stt_mode.as_str() {
        "cloud" => SttMode::Cloud,
        _ => SttMode::Offline,
    };

    s.initial_setup.completed = true;
    s.initial_setup.stt_mode = mode.clone();

    if mode == SttMode::Cloud {
        let provider = match cloud_provider.as_deref() {
            Some("groq") => CloudSttProvider::Groq,
            Some("google") => CloudSttProvider::Google,
            _ => CloudSttProvider::OpenAI,
        };

        s.initial_setup.cloud_stt_config = CloudSttConfig {
            provider,
            api_key: cloud_api_key.unwrap_or_default(),
            model: cloud_model.unwrap_or_default(),
        };
    }

    settings::save_settings(&app, &s)
}

#[command]
pub fn get_stt_mode(app: AppHandle) -> String {
    let s = settings::load_settings(&app);
    match s.initial_setup.stt_mode {
        SttMode::Cloud => "cloud".to_string(),
        SttMode::Offline => "offline".to_string(),
    }
}

#[command]
pub fn set_stt_mode(app: AppHandle, mode: String) -> Result<(), String> {
    let mut s = settings::load_settings(&app);
    s.initial_setup.stt_mode = match mode.as_str() {
        "cloud" => SttMode::Cloud,
        _ => SttMode::Offline,
    };
    settings::save_settings(&app, &s)
}

#[command]
pub fn get_cloud_stt_config(app: AppHandle) -> CloudSttConfig {
    let s = settings::load_settings(&app);
    s.initial_setup.cloud_stt_config
}

#[command]
pub fn set_cloud_stt_config(
    app: AppHandle,
    provider: String,
    api_key: String,
    model: String,
) -> Result<(), String> {
    let mut s = settings::load_settings(&app);
    s.initial_setup.cloud_stt_config = CloudSttConfig {
        provider: match provider.as_str() {
            "groq" => CloudSttProvider::Groq,
            "google" => CloudSttProvider::Google,
            _ => CloudSttProvider::OpenAI,
        },
        api_key,
        model,
    };
    settings::save_settings(&app, &s)
}
