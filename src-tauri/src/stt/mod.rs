pub mod providers;
pub mod types;

use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager};

pub use types::*;

fn stt_settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    if let Err(e) = fs::create_dir_all(&dir) {
        return Err(format!("create_dir_all failed: {}", e));
    }
    Ok(dir.join("stt_settings.json"))
}

pub fn load_stt_settings(app: &AppHandle) -> STTSettings {
    let path = match stt_settings_path(app) {
        Ok(p) => p,
        Err(_) => return STTSettings::default(),
    };

    match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str::<STTSettings>(&content).unwrap_or_default(),
        Err(_) => {
            let defaults = STTSettings::default();
            let _ = save_stt_settings(app, &defaults);
            defaults
        }
    }
}

pub fn save_stt_settings(app: &AppHandle, settings: &STTSettings) -> Result<(), String> {
    let path = stt_settings_path(app)?;
    let content = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}

pub fn get_provider_key(provider: &STTProvider) -> String {
    match provider {
        STTProvider::Offline => "offline".to_string(),
        STTProvider::OpenAI => "openai".to_string(),
        STTProvider::Google => "google".to_string(),
        STTProvider::Groq => "groq".to_string(),
    }
}
