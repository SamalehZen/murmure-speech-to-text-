use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::licensing::crypto::{get_supabase_key, get_supabase_url};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdminDevice {
    pub id: String,
    pub device_id: String,
    pub device_name: Option<String>,
    pub user_id: Option<String>,
    pub company_id: Option<String>,
    pub platform: String,
    pub app_version: String,
    pub registered_at: String,
    pub last_heartbeat: String,
    pub is_blocked: bool,
    pub blocked_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdminCompany {
    pub id: String,
    pub name: String,
    pub email: Option<String>,
    pub subscription_status: String,
    pub subscription_expires_at: Option<String>,
    pub max_devices: i32,
    pub max_users: i32,
    pub is_blocked: bool,
    pub blocked_reason: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdminUser {
    pub id: String,
    pub email: Option<String>,
    pub name: Option<String>,
    pub company_id: Option<String>,
    pub subscription_status: String,
    pub is_blocked: bool,
    pub blocked_reason: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseStats {
    pub total_devices: i64,
    pub active_devices: i64,
    pub blocked_devices: i64,
    pub total_companies: i64,
    pub total_users: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLogEntry {
    pub id: String,
    pub device_id: String,
    pub action: String,
    pub status: String,
    pub ip_address: Option<String>,
    pub details: serde_json::Value,
    pub created_at: String,
}

async fn admin_request<T: for<'de> Deserialize<'de>>(
    endpoint: &str,
    body: Option<serde_json::Value>,
) -> Result<T, String> {
    let client = reqwest::Client::new();
    let url = format!("{}/rpc/{}", get_supabase_url(), endpoint);
    let api_key = get_supabase_key();

    let mut req = client
        .post(&url)
        .header("apikey", &api_key)
        .header("Authorization", format!("Bearer {}", &api_key))
        .header("Content-Type", "application/json");

    if let Some(b) = body {
        req = req.json(&b);
    }

    let response = req.send().await.map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("API error: {}", response.status()));
    }

    response.json().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn admin_get_stats(_app: AppHandle) -> Result<LicenseStats, String> {
    admin_request("admin_get_stats", None).await
}

#[tauri::command]
pub async fn admin_list_devices(_app: AppHandle) -> Result<Vec<AdminDevice>, String> {
    admin_request("admin_list_devices", None).await
}

#[tauri::command]
pub async fn admin_list_companies(_app: AppHandle) -> Result<Vec<AdminCompany>, String> {
    admin_request("admin_list_companies", None).await
}

#[tauri::command]
pub async fn admin_list_users(_app: AppHandle) -> Result<Vec<AdminUser>, String> {
    admin_request("admin_list_users", None).await
}

#[tauri::command]
pub async fn admin_block_device(
    _app: AppHandle,
    device_id: String,
    reason: Option<String>,
) -> Result<(), String> {
    let body = serde_json::json!({
        "p_device_id": device_id,
        "p_reason": reason
    });
    let _: serde_json::Value = admin_request("admin_block_device", Some(body)).await?;
    Ok(())
}

#[tauri::command]
pub async fn admin_unblock_device(_app: AppHandle, device_id: String) -> Result<(), String> {
    let body = serde_json::json!({ "p_device_id": device_id });
    let _: serde_json::Value = admin_request("admin_unblock_device", Some(body)).await?;
    Ok(())
}

#[tauri::command]
pub async fn admin_block_company(
    _app: AppHandle,
    company_id: String,
    reason: Option<String>,
) -> Result<(), String> {
    let body = serde_json::json!({
        "p_company_id": company_id,
        "p_reason": reason
    });
    let _: serde_json::Value = admin_request("admin_block_company", Some(body)).await?;
    Ok(())
}

#[tauri::command]
pub async fn admin_unblock_company(_app: AppHandle, company_id: String) -> Result<(), String> {
    let body = serde_json::json!({ "p_company_id": company_id });
    let _: serde_json::Value = admin_request("admin_unblock_company", Some(body)).await?;
    Ok(())
}

#[tauri::command]
pub async fn admin_block_user(
    _app: AppHandle,
    user_id: String,
    reason: Option<String>,
) -> Result<(), String> {
    let body = serde_json::json!({
        "p_user_id": user_id,
        "p_reason": reason
    });
    let _: serde_json::Value = admin_request("admin_block_user", Some(body)).await?;
    Ok(())
}

#[tauri::command]
pub async fn admin_unblock_user(_app: AppHandle, user_id: String) -> Result<(), String> {
    let body = serde_json::json!({ "p_user_id": user_id });
    let _: serde_json::Value = admin_request("admin_unblock_user", Some(body)).await?;
    Ok(())
}

#[tauri::command]
pub async fn admin_get_audit_log(
    _app: AppHandle,
    device_id: Option<String>,
    limit: Option<i32>,
) -> Result<Vec<AuditLogEntry>, String> {
    let body = serde_json::json!({
        "p_device_id": device_id,
        "p_limit": limit.unwrap_or(100)
    });
    admin_request("admin_get_audit_log", Some(body)).await
}
