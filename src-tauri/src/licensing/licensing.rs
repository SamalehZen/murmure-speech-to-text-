use chrono::Utc;
use log::{error, info, warn};
use tauri::AppHandle;
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

use super::client::LicenseClient;
use super::helpers::{days_since, get_app_version, get_current_timestamp, get_platform};
use super::store;
use super::types::{DeviceInfo, LicenseState, RegisterDeviceRequest, SubscriptionStatus};

const GRACE_PERIOD_DAYS: i64 = 10;

pub async fn validate_license(app: &AppHandle) -> Result<(), String> {
    let device_id = store::get_or_create_device_id(app)?;
    let stored_state = store::load_license_state(app);

    let client = LicenseClient::from_env();

    match client.check_subscription(&device_id).await {
        Ok(response) => handle_subscription_response(app, &device_id, &stored_state, response),
        Err(e) => handle_network_error(app, &stored_state, e),
    }
}

fn handle_subscription_response(
    app: &AppHandle,
    device_id: &str,
    stored_state: &Option<LicenseState>,
    response: super::types::CheckSubscriptionResponse,
) -> Result<(), String> {
    match response.status {
        SubscriptionStatus::Active => {
            let state = LicenseState {
                device: DeviceInfo {
                    device_id: device_id.to_string(),
                    user_id: None,
                    company_id: None,
                    registered_at: stored_state
                        .as_ref()
                        .map(|s| s.device.registered_at)
                        .unwrap_or_else(get_current_timestamp),
                    last_check: get_current_timestamp(),
                },
                status: SubscriptionStatus::Active,
                last_successful_check: get_current_timestamp(),
                grace_period_days: GRACE_PERIOD_DAYS as u32,
            };
            store::save_license_state(app, &state)?;
            info!("License validated successfully");
            Ok(())
        }
        SubscriptionStatus::Blocked
        | SubscriptionStatus::Suspended
        | SubscriptionStatus::Expired => {
            error!("License invalid: {:?}", response.status);
            let message = response
                .message
                .unwrap_or_else(|| "Your license is not valid.".to_string());
            trigger_lockout(app, &message);
            Err("License blocked".to_string())
        }
    }
}

fn handle_network_error(
    app: &AppHandle,
    stored_state: &Option<LicenseState>,
    error: String,
) -> Result<(), String> {
    warn!("Cannot reach license server: {}", error);

    match stored_state {
        Some(state) => {
            let days_offline = days_since(state.last_successful_check);

            if days_offline <= GRACE_PERIOD_DAYS {
                info!(
                    "Operating in grace period ({}/{} days)",
                    days_offline, GRACE_PERIOD_DAYS
                );
                Ok(())
            } else {
                error!("Grace period expired ({} days)", days_offline);
                trigger_lockout(
                    app,
                    "License verification required. Please connect to the internet.",
                );
                Err("Grace period expired".to_string())
            }
        }
        None => {
            error!("First run requires internet connection for license activation");
            trigger_lockout(
                app,
                "Internet connection required for initial license activation.",
            );
            Err("Initial activation required".to_string())
        }
    }
}

fn trigger_lockout(app: &AppHandle, message: &str) {
    let app_clone = app.clone();
    let msg = message.to_string();

    tauri::async_runtime::spawn(async move {
        app_clone
            .dialog()
            .message(msg)
            .kind(MessageDialogKind::Error)
            .title("Murmure - License Error")
            .blocking_show();

        std::process::exit(1);
    });
}

pub async fn register_device(app: &AppHandle) -> Result<(), String> {
    let device_id = store::get_or_create_device_id(app)?;
    let client = LicenseClient::from_env();

    let request = RegisterDeviceRequest {
        device_id,
        user_id: None,
        company_id: None,
        platform: get_platform(),
        app_version: get_app_version(),
    };

    client.register_device(request).await
}

pub async fn send_heartbeat(app: &AppHandle) -> Result<(), String> {
    let device_id = store::get_or_create_device_id(app)?;
    let client = LicenseClient::from_env();
    client.heartbeat(&device_id).await
}

pub fn get_license_status(app: &AppHandle) -> Option<LicenseState> {
    store::load_license_state(app)
}

pub fn get_device_id(app: &AppHandle) -> Result<String, String> {
    store::get_or_create_device_id(app)
}

pub fn get_grace_period_info(app: &AppHandle) -> Option<(i64, i64)> {
    let state = store::load_license_state(app)?;
    let days_offline = days_since(state.last_successful_check);
    Some((days_offline, GRACE_PERIOD_DAYS))
}
