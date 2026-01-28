use tauri::AppHandle;

use crate::cloud_sync::{
    apply, auth, storage, sync,
    types::{CloudAuthState, CloudUser, GlobalConfig, SyncStatus},
};

#[tauri::command]
pub async fn cloud_login(
    app: AppHandle,
    backend_url: String,
    email: String,
    password: String,
) -> Result<CloudUser, String> {
    auth::login(&app, &backend_url, &email, &password).await
}

#[tauri::command]
pub async fn cloud_login_with_token(
    app: AppHandle,
    backend_url: String,
    token: String,
) -> Result<CloudUser, String> {
    auth::login_with_token(&app, &backend_url, &token).await
}

#[tauri::command]
pub fn cloud_logout(app: AppHandle) -> Result<(), String> {
    auth::logout(&app)
}

#[tauri::command]
pub fn cloud_get_auth_state(app: AppHandle) -> CloudAuthState {
    auth::get_auth_state(&app)
}

#[tauri::command]
pub fn cloud_get_current_user(app: AppHandle) -> Option<CloudUser> {
    auth::get_current_user(&app)
}

#[tauri::command]
pub fn cloud_is_authenticated(app: AppHandle) -> bool {
    storage::is_authenticated(&app)
}

#[tauri::command]
pub async fn cloud_sync_config(app: AppHandle) -> Result<GlobalConfig, String> {
    sync::sync_config(&app).await
}

#[tauri::command]
pub fn cloud_get_cached_config(app: AppHandle) -> Option<GlobalConfig> {
    sync::get_cached_config(&app)
}

#[tauri::command]
pub fn cloud_get_sync_status(app: AppHandle) -> SyncStatus {
    sync::get_sync_status(&app)
}

#[tauri::command]
pub async fn cloud_sync_if_needed(app: AppHandle) -> Result<Option<GlobalConfig>, String> {
    sync::sync_config_if_needed(&app).await
}

#[tauri::command]
pub fn cloud_apply_dictionary(app: AppHandle) -> Result<(), String> {
    let config = sync::get_cached_config(&app).ok_or("No cached config available")?;
    apply::apply_cloud_dictionary(&app, &config)
}
