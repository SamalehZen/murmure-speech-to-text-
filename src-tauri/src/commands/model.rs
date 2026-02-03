use crate::model::Model;
use std::sync::Arc;
use tauri::{command, AppHandle, State};

#[command]
pub fn is_model_available(model: State<Arc<Model>>) -> bool {
    model.is_available()
}

#[command]
pub fn get_model_path(model: State<Arc<Model>>) -> Result<String, String> {
    let path = model.get_model_path().map_err(|e| format!("{:#}", e))?;

    Ok(path.to_string_lossy().to_string())
}

#[command]
pub fn is_offline_model_available(app: AppHandle) -> bool {
    crate::model::download::is_model_downloaded(&app)
}

#[command]
pub async fn download_offline_model(app: AppHandle) -> Result<(), String> {
    crate::model::download::download_model(app)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub fn delete_offline_model(app: AppHandle) -> Result<(), String> {
    crate::model::download::delete_model(&app).map_err(|e| e.to_string())
}

#[command]
pub fn get_offline_model_size(app: AppHandle) -> Option<u64> {
    crate::model::download::get_model_size(&app)
}
