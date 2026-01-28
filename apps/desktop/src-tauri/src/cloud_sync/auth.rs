use log::{error, info};
use reqwest::Client;
use tauri::AppHandle;

use super::storage::{clear_cloud_sync_state, load_cloud_sync_state, save_cloud_sync_state};
use super::types::{CloudAuthState, CloudSyncState, CloudUser, LoginRequest, SyncStatus};

pub async fn login(
    app: &AppHandle,
    backend_url: &str,
    email: &str,
    password: &str,
) -> Result<CloudUser, String> {
    let client = Client::new();
    let url = format!("{}/api/auth/login", backend_url.trim_end_matches('/'));

    let login_request = LoginRequest {
        email: email.to_string(),
        password: password.to_string(),
    };

    info!("Attempting login to {}", url);

    let response = client
        .post(&url)
        .json(&login_request)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        error!("Login failed: {} - {}", status, error_text);
        return Err(format!("Login failed: {}", status));
    }

    #[derive(serde::Deserialize)]
    struct AuthResponse {
        token: String,
        user: CloudUser,
    }

    let auth_response: AuthResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let state = CloudSyncState {
        auth: CloudAuthState {
            is_authenticated: true,
            user: Some(auth_response.user.clone()),
            token: Some(auth_response.token),
            backend_url: Some(backend_url.to_string()),
        },
        sync_status: SyncStatus::default(),
        cached_config: None,
    };

    save_cloud_sync_state(app, &state)?;
    info!("Login successful for user: {}", auth_response.user.email);

    Ok(auth_response.user)
}

pub async fn login_with_token(
    app: &AppHandle,
    backend_url: &str,
    token: &str,
) -> Result<CloudUser, String> {
    let client = Client::new();
    let url = format!("{}/api/auth/me", backend_url.trim_end_matches('/'));

    info!("Validating token with {}", url);

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        error!("Token validation failed: {}", status);
        return Err(format!("Token validation failed: {}", status));
    }

    let user: CloudUser = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let state = CloudSyncState {
        auth: CloudAuthState {
            is_authenticated: true,
            user: Some(user.clone()),
            token: Some(token.to_string()),
            backend_url: Some(backend_url.to_string()),
        },
        sync_status: SyncStatus::default(),
        cached_config: None,
    };

    save_cloud_sync_state(app, &state)?;
    info!("Token validated for user: {}", user.email);

    Ok(user)
}

pub fn logout(app: &AppHandle) -> Result<(), String> {
    clear_cloud_sync_state(app)?;
    info!("User logged out");
    Ok(())
}

pub fn get_current_user(app: &AppHandle) -> Option<CloudUser> {
    let state = load_cloud_sync_state(app);
    state.auth.user
}

pub fn get_auth_state(app: &AppHandle) -> CloudAuthState {
    let state = load_cloud_sync_state(app);
    state.auth
}
