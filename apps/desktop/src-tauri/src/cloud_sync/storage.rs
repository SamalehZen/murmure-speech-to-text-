use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager};
use log::{error, info};

use super::types::{CloudAuthState, CloudSyncState, GlobalConfig, SyncStatus};

const CLOUD_SYNC_FILE: &str = "cloud_sync.json";
const CACHED_CONFIG_FILE: &str = "cached_cloud_config.json";

fn get_storage_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    if let Err(e) = fs::create_dir_all(&dir) {
        return Err(format!("Failed to create storage directory: {}", e));
    }
    Ok(dir)
}

pub fn load_cloud_sync_state(app: &AppHandle) -> CloudSyncState {
    let dir = match get_storage_dir(app) {
        Ok(d) => d,
        Err(e) => {
            error!("Failed to get storage dir: {}", e);
            return CloudSyncState::default();
        }
    };

    let state_path = dir.join(CLOUD_SYNC_FILE);
    let config_path = dir.join(CACHED_CONFIG_FILE);

    let mut state = match fs::read_to_string(&state_path) {
        Ok(content) => serde_json::from_str::<CloudSyncState>(&content).unwrap_or_default(),
        Err(_) => CloudSyncState::default(),
    };

    if let Ok(config_content) = fs::read_to_string(&config_path) {
        if let Ok(config) = serde_json::from_str::<GlobalConfig>(&config_content) {
            state.cached_config = Some(config);
        }
    }

    state
}

pub fn save_cloud_sync_state(app: &AppHandle, state: &CloudSyncState) -> Result<(), String> {
    let dir = get_storage_dir(app)?;
    let state_path = dir.join(CLOUD_SYNC_FILE);

    let state_to_save = CloudSyncState {
        auth: CloudAuthState {
            is_authenticated: state.auth.is_authenticated,
            user: state.auth.user.clone(),
            token: state.auth.token.clone(),
            backend_url: state.auth.backend_url.clone(),
        },
        sync_status: state.sync_status.clone(),
        cached_config: None,
    };

    let content = serde_json::to_string_pretty(&state_to_save).map_err(|e| e.to_string())?;
    fs::write(&state_path, content).map_err(|e| e.to_string())?;

    info!("Cloud sync state saved");
    Ok(())
}

pub fn save_cached_config(app: &AppHandle, config: &GlobalConfig) -> Result<(), String> {
    let dir = get_storage_dir(app)?;
    let config_path = dir.join(CACHED_CONFIG_FILE);

    let content = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(&config_path, content).map_err(|e| e.to_string())?;

    info!("Cached cloud config saved");
    Ok(())
}

pub fn clear_cloud_sync_state(app: &AppHandle) -> Result<(), String> {
    let dir = get_storage_dir(app)?;
    let state_path = dir.join(CLOUD_SYNC_FILE);
    let config_path = dir.join(CACHED_CONFIG_FILE);

    if state_path.exists() {
        fs::remove_file(&state_path).map_err(|e| e.to_string())?;
    }

    if config_path.exists() {
        fs::remove_file(&config_path).map_err(|e| e.to_string())?;
    }

    info!("Cloud sync state cleared");
    Ok(())
}

pub fn get_auth_token(app: &AppHandle) -> Option<String> {
    let state = load_cloud_sync_state(app);
    state.auth.token
}

pub fn get_backend_url(app: &AppHandle) -> Option<String> {
    let state = load_cloud_sync_state(app);
    state.auth.backend_url
}

pub fn is_authenticated(app: &AppHandle) -> bool {
    let state = load_cloud_sync_state(app);
    state.auth.is_authenticated && state.auth.token.is_some()
}
