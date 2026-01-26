use tauri::AppHandle;

use crate::licensing::{self, LicenseState};

#[tauri::command]
pub async fn get_license_status(app: AppHandle) -> Result<LicenseState, String> {
    licensing::get_license_status(&app).ok_or_else(|| "No license state found".to_string())
}

#[tauri::command]
pub async fn force_license_check(app: AppHandle) -> Result<(), String> {
    licensing::validate_license(&app).await
}

#[tauri::command]
pub async fn get_device_id(app: AppHandle) -> Result<String, String> {
    licensing::get_device_id(&app)
}

#[tauri::command]
pub async fn get_grace_period_info(app: AppHandle) -> Result<(i64, i64), String> {
    licensing::get_grace_period_info(&app).ok_or_else(|| "No license state found".to_string())
}
