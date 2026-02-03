use crate::model::{DownloadCancelFlag, Model, ModelDownloadManager, ParakeetStatus};
use std::sync::Arc;
use tauri::{command, State};
use tokio::sync::Mutex;

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
pub async fn start_parakeet_download(
    download_manager: State<'_, Arc<Mutex<ModelDownloadManager>>>,
    cancel_flag: State<'_, DownloadCancelFlag>,
) -> Result<(), String> {
    let manager = download_manager.lock().await;
    manager
        .download_parakeet(&cancel_flag)
        .await
        .map_err(|e| format!("{}", e))
}

#[command]
pub fn cancel_parakeet_download(cancel_flag: State<'_, DownloadCancelFlag>) -> Result<(), String> {
    cancel_flag.cancel();
    Ok(())
}

#[command]
pub async fn delete_parakeet_model(
    download_manager: State<'_, Arc<Mutex<ModelDownloadManager>>>,
) -> Result<(), String> {
    let manager = download_manager.lock().await;
    manager
        .delete_parakeet()
        .await
        .map_err(|e| format!("{}", e))
}

#[command]
pub async fn get_parakeet_status(
    download_manager: State<'_, Arc<Mutex<ModelDownloadManager>>>,
) -> Result<ParakeetStatus, String> {
    let manager = download_manager.lock().await;
    let downloaded = manager.is_downloaded();
    let path = manager.get_model_path();
    let size_bytes = manager.get_model_size();

    Ok(ParakeetStatus {
        downloaded,
        size_bytes,
        path: path.map(|p| p.to_string_lossy().to_string()),
    })
}
