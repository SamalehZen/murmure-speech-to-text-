use chrono::Utc;
use log::{error, info, warn};
use reqwest::Client;
use tauri::AppHandle;

use super::storage::{
    get_auth_token, get_backend_url, is_authenticated, load_cloud_sync_state, save_cached_config,
    save_cloud_sync_state,
};
use super::types::{GlobalConfig, SyncStatus};

pub async fn sync_config(app: &AppHandle) -> Result<GlobalConfig, String> {
    if !is_authenticated(app) {
        return Err("Not authenticated".to_string());
    }

    let token = get_auth_token(app).ok_or("No auth token found")?;
    let backend_url = get_backend_url(app).ok_or("No backend URL configured")?;

    let mut state = load_cloud_sync_state(app);
    state.sync_status.is_syncing = true;
    state.sync_status.error = None;
    let _ = save_cloud_sync_state(app, &state);

    let client = Client::new();
    let url = format!("{}/api/client/config", backend_url.trim_end_matches('/'));

    info!("Syncing config from {}", url);

    let mut request = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token));

    if let Some(ref hash) = state.sync_status.config_hash {
        request = request.header("If-None-Match", hash.clone());
    }

    let response = match request.send().await {
        Ok(r) => r,
        Err(e) => {
            let error_msg = format!("Network error: {}", e);
            error!("{}", error_msg);
            state.sync_status.is_syncing = false;
            state.sync_status.error = Some(error_msg.clone());
            let _ = save_cloud_sync_state(app, &state);
            return Err(error_msg);
        }
    };

    if response.status().as_u16() == 304 {
        info!("Config unchanged (304 Not Modified)");
        state.sync_status.is_syncing = false;
        state.sync_status.last_sync = Some(Utc::now().to_rfc3339());
        let _ = save_cloud_sync_state(app, &state);

        return state
            .cached_config
            .ok_or_else(|| "No cached config available".to_string());
    }

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        let error_msg = format!("Sync failed: {} - {}", status, error_text);
        error!("{}", error_msg);
        state.sync_status.is_syncing = false;
        state.sync_status.error = Some(error_msg.clone());
        let _ = save_cloud_sync_state(app, &state);
        return Err(error_msg);
    }

    let etag = response
        .headers()
        .get("etag")
        .and_then(|h| h.to_str().ok())
        .map(String::from);

    let config: GlobalConfig = match response.json().await {
        Ok(c) => c,
        Err(e) => {
            let error_msg = format!("Failed to parse config: {}", e);
            error!("{}", error_msg);
            state.sync_status.is_syncing = false;
            state.sync_status.error = Some(error_msg.clone());
            let _ = save_cloud_sync_state(app, &state);
            return Err(error_msg);
        }
    };

    if let Err(e) = save_cached_config(app, &config) {
        warn!("Failed to cache config: {}", e);
    }

    state.sync_status.is_syncing = false;
    state.sync_status.last_sync = Some(Utc::now().to_rfc3339());
    state.sync_status.config_hash = etag;
    state.sync_status.error = None;
    state.cached_config = Some(config.clone());
    let _ = save_cloud_sync_state(app, &state);

    info!("Config synced successfully");
    Ok(config)
}

pub fn get_cached_config(app: &AppHandle) -> Option<GlobalConfig> {
    let state = load_cloud_sync_state(app);
    state.cached_config
}

pub fn get_sync_status(app: &AppHandle) -> SyncStatus {
    let state = load_cloud_sync_state(app);
    state.sync_status
}

pub async fn sync_config_if_needed(app: &AppHandle) -> Result<Option<GlobalConfig>, String> {
    if !is_authenticated(app) {
        info!("Skipping sync - not authenticated");
        return Ok(None);
    }

    let state = load_cloud_sync_state(app);

    let should_sync = match state.sync_status.last_sync {
        None => true,
        Some(ref last_sync) => {
            if let Ok(last) = chrono::DateTime::parse_from_rfc3339(last_sync) {
                let elapsed = Utc::now().signed_duration_since(last);
                elapsed.num_minutes() > 5
            } else {
                true
            }
        }
    };

    if should_sync {
        match sync_config(app).await {
            Ok(config) => Ok(Some(config)),
            Err(e) => {
                warn!("Sync failed, using cached config: {}", e);
                Ok(state.cached_config)
            }
        }
    } else {
        info!("Using cached config (sync not needed)");
        Ok(state.cached_config)
    }
}
