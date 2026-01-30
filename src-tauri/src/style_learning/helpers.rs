use super::types::StyleLearningSettings;
use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager};

fn style_learning_settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    if let Err(e) = fs::create_dir_all(&dir) {
        return Err(format!("create_dir_all failed: {}", e));
    }
    Ok(dir.join("style_learning.json"))
}

pub fn load_style_learning_settings(app: &AppHandle) -> StyleLearningSettings {
    let path = match style_learning_settings_path(app) {
        Ok(p) => p,
        Err(_) => return StyleLearningSettings::default(),
    };

    match fs::read_to_string(&path) {
        Ok(content) => {
            serde_json::from_str::<StyleLearningSettings>(&content).unwrap_or_default()
        }
        Err(_) => StyleLearningSettings::default(),
    }
}

pub fn save_style_learning_settings(
    app: &AppHandle,
    settings: &StyleLearningSettings,
) -> Result<(), String> {
    let path = style_learning_settings_path(app)?;
    let content = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}
