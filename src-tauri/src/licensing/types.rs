use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SubscriptionStatus {
    Active,
    Suspended,
    Expired,
    Blocked,
}

impl Default for SubscriptionStatus {
    fn default() -> Self {
        SubscriptionStatus::Active
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub device_id: String,
    pub user_id: Option<String>,
    pub company_id: Option<String>,
    pub registered_at: DateTime<Utc>,
    pub last_check: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseState {
    pub device: DeviceInfo,
    pub status: SubscriptionStatus,
    pub last_successful_check: DateTime<Utc>,
    pub grace_period_days: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckSubscriptionResponse {
    pub status: SubscriptionStatus,
    pub message: Option<String>,
    pub expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisterDeviceRequest {
    pub device_id: String,
    pub user_id: Option<String>,
    pub company_id: Option<String>,
    pub platform: String,
    pub app_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeartbeatRequest {
    pub device_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupabaseRpcRequest<T> {
    #[serde(flatten)]
    pub params: T,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckSubscriptionParams {
    pub p_device_id: String,
}
