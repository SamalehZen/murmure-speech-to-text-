use super::types::PowerModeSettings;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const STORE_FILE: &str = "power_modes.json";
const SETTINGS_KEY: &str = "settings";

pub fn load(app: &AppHandle) -> Result<PowerModeSettings, String> {
    let store = app.store(STORE_FILE).map_err(|e| e.to_string())?;

    match store.get(SETTINGS_KEY) {
        Some(value) => serde_json::from_value::<PowerModeSettings>(value)
            .map_err(|e| format!("Failed to parse power mode settings: {}", e)),
        None => Ok(PowerModeSettings::default()),
    }
}

pub fn save(app: &AppHandle, settings: &PowerModeSettings) -> Result<(), String> {
    let store = app.store(STORE_FILE).map_err(|e| e.to_string())?;

    let value = serde_json::to_value(settings)
        .map_err(|e| format!("Failed to serialize power mode settings: {}", e))?;

    store.set(SETTINGS_KEY, value);

    Ok(())
}
