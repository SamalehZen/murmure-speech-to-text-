pub mod parser;
pub mod types;

pub use parser::*;
pub use types::*;

use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager};

fn voice_commands_settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    if let Err(e) = fs::create_dir_all(&dir) {
        return Err(format!("create_dir_all failed: {}", e));
    }
    Ok(dir.join("voice_commands.json"))
}

pub fn load_voice_command_settings(app: &AppHandle) -> VoiceCommandSettings {
    let path = match voice_commands_settings_path(app) {
        Ok(p) => p,
        Err(_) => return VoiceCommandSettings::default(),
    };

    match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str::<VoiceCommandSettings>(&content).unwrap_or_default(),
        Err(_) => {
            let defaults = VoiceCommandSettings::default();
            let _ = save_voice_command_settings(app, &defaults);
            defaults
        }
    }
}

pub fn save_voice_command_settings(
    app: &AppHandle,
    settings: &VoiceCommandSettings,
) -> Result<(), String> {
    let path = voice_commands_settings_path(app)?;
    let content = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}
