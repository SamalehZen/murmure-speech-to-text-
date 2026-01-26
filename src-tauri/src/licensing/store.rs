use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

use super::helpers::generate_device_id;
use super::types::LicenseState;

const LICENSE_STORE_PATH: &str = "license.dat";
const DEVICE_ID_KEY: &str = "device_id";
const LICENSE_STATE_KEY: &str = "license_state";

pub fn get_or_create_device_id(app: &AppHandle) -> Result<String, String> {
    let store = app.store(LICENSE_STORE_PATH).map_err(|e| e.to_string())?;

    if let Some(id) = store.get(DEVICE_ID_KEY) {
        if let Some(id_str) = id.as_str() {
            if !id_str.is_empty() {
                return Ok(id_str.to_string());
            }
        }
    }

    let new_id = generate_device_id();
    store.set(DEVICE_ID_KEY, serde_json::json!(new_id));
    store.save().map_err(|e| e.to_string())?;

    Ok(new_id)
}

pub fn save_license_state(app: &AppHandle, state: &LicenseState) -> Result<(), String> {
    let store = app.store(LICENSE_STORE_PATH).map_err(|e| e.to_string())?;
    let state_json = serde_json::to_value(state).map_err(|e| e.to_string())?;
    store.set(LICENSE_STATE_KEY, state_json);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

pub fn load_license_state(app: &AppHandle) -> Option<LicenseState> {
    let store = app.store(LICENSE_STORE_PATH).ok()?;
    let state_value = store.get(LICENSE_STATE_KEY)?;
    serde_json::from_value(state_value.clone()).ok()
}

pub fn clear_license_state(app: &AppHandle) -> Result<(), String> {
    let store = app.store(LICENSE_STORE_PATH).map_err(|e| e.to_string())?;
    store.delete(LICENSE_STATE_KEY);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}
