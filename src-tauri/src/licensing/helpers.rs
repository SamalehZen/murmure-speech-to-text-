use chrono::{DateTime, Utc};
use uuid::Uuid;

pub fn generate_device_id() -> String {
    Uuid::new_v4().to_string()
}

pub fn get_current_timestamp() -> DateTime<Utc> {
    Utc::now()
}

pub fn days_since(timestamp: DateTime<Utc>) -> i64 {
    (Utc::now() - timestamp).num_days()
}

pub fn get_platform() -> String {
    #[cfg(target_os = "windows")]
    return "windows".to_string();

    #[cfg(target_os = "linux")]
    return "linux".to_string();

    #[cfg(target_os = "macos")]
    return "macos".to_string();

    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    return "unknown".to_string();
}

pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
