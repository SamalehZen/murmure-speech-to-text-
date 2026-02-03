use anyhow::Result;
use futures_util::StreamExt;
use log::{error, info};
use std::io::Write;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter, Manager};

const MODEL_NAME: &str = "parakeet-tdt-0.6b-v3-int8";
const MODEL_URL: &str =
    "https://github.com/Kieirra/murmure/releases/download/models/parakeet-tdt-0.6b-v3-int8.tar.gz";

#[derive(Clone, serde::Serialize)]
pub struct DownloadProgress {
    pub downloaded: u64,
    pub total: u64,
    pub percentage: f32,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

pub fn get_models_dir(app: &AppHandle) -> Result<PathBuf> {
    let app_data = app.path().app_data_dir()?;
    let models_dir = app_data.join("models");
    std::fs::create_dir_all(&models_dir)?;
    Ok(models_dir)
}

pub fn get_model_path(app: &AppHandle) -> Result<PathBuf> {
    Ok(get_models_dir(app)?.join(MODEL_NAME))
}

pub fn is_model_downloaded(app: &AppHandle) -> bool {
    get_model_path(app)
        .map(|p| p.exists() && p.join("encoder.onnx").exists())
        .unwrap_or(false)
}

pub async fn download_model(app: AppHandle) -> Result<()> {
    let models_dir = get_models_dir(&app)?;
    let model_path = models_dir.join(MODEL_NAME);
    let archive_path = models_dir.join(format!("{}.tar.gz", MODEL_NAME));

    let result = download_model_inner(&app, &models_dir, &model_path, &archive_path).await;

    if result.is_err() {
        if archive_path.exists() {
            let _ = std::fs::remove_file(&archive_path);
        }
    }

    result
}

async fn download_model_inner(
    app: &AppHandle,
    models_dir: &Path,
    model_path: &Path,
    archive_path: &Path,
) -> Result<()> {
    emit_progress(app, 0, 0, 0.0, "downloading", None);

    let client = reqwest::Client::new();
    let response = match client.get(MODEL_URL).send().await {
        Ok(resp) => resp,
        Err(e) => {
            let error_msg = format!("Failed to start download: {}", e);
            emit_progress(app, 0, 0, 0.0, "error", Some(&error_msg));
            return Err(anyhow::anyhow!(error_msg));
        }
    };

    if !response.status().is_success() {
        let error_msg = format!("Download failed with status: {}", response.status());
        emit_progress(app, 0, 0, 0.0, "error", Some(&error_msg));
        return Err(anyhow::anyhow!(error_msg));
    }

    let total_size = response.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();

    let mut file = match std::fs::File::create(archive_path) {
        Ok(f) => f,
        Err(e) => {
            let error_msg = format!("Failed to create archive file: {}", e);
            emit_progress(app, 0, total_size, 0.0, "error", Some(&error_msg));
            return Err(anyhow::anyhow!(error_msg));
        }
    };

    while let Some(chunk_result) = stream.next().await {
        let chunk = match chunk_result {
            Ok(c) => c,
            Err(e) => {
                let error_msg = format!("Download interrupted: {}", e);
                emit_progress(app, downloaded, total_size, 0.0, "error", Some(&error_msg));
                return Err(anyhow::anyhow!(error_msg));
            }
        };

        if let Err(e) = file.write_all(&chunk) {
            let error_msg = format!("Failed to write to archive: {}", e);
            emit_progress(app, downloaded, total_size, 0.0, "error", Some(&error_msg));
            return Err(anyhow::anyhow!(error_msg));
        }

        downloaded += chunk.len() as u64;

        let percentage = if total_size > 0 {
            (downloaded as f32 / total_size as f32) * 100.0
        } else {
            0.0
        };

        emit_progress(app, downloaded, total_size, percentage, "downloading", None);
    }

    drop(file);

    emit_progress(app, total_size, total_size, 100.0, "extracting", None);

    if let Err(e) = extract_tar_gz(archive_path, models_dir) {
        let error_msg = format!("Failed to extract archive: {}", e);
        emit_progress(app, total_size, total_size, 100.0, "error", Some(&error_msg));
        return Err(anyhow::anyhow!(error_msg));
    }

    if let Err(e) = std::fs::remove_file(archive_path) {
        error!("Failed to cleanup archive: {}", e);
    }

    if !model_path.join("encoder.onnx").exists() {
        let error_msg = "Model extraction failed - encoder.onnx not found".to_string();
        emit_progress(app, total_size, total_size, 100.0, "error", Some(&error_msg));
        return Err(anyhow::anyhow!(error_msg));
    }

    emit_progress(app, total_size, total_size, 100.0, "complete", None);

    info!("Model downloaded and extracted to: {}", model_path.display());
    Ok(())
}

fn emit_progress(
    app: &AppHandle,
    downloaded: u64,
    total: u64,
    percentage: f32,
    status: &str,
    error: Option<&str>,
) {
    let _ = app.emit(
        "model-download-progress",
        DownloadProgress {
            downloaded,
            total,
            percentage,
            status: status.to_string(),
            error: error.map(|s| s.to_string()),
        },
    );
}

fn extract_tar_gz(archive_path: &Path, dest_dir: &Path) -> Result<()> {
    use flate2::read::GzDecoder;
    use tar::Archive;

    let file = std::fs::File::open(archive_path)?;
    let decoder = GzDecoder::new(file);
    let mut archive = Archive::new(decoder);
    archive.unpack(dest_dir)?;

    Ok(())
}

pub fn delete_model(app: &AppHandle) -> Result<()> {
    let model_path = get_model_path(app)?;
    if model_path.exists() {
        std::fs::remove_dir_all(&model_path)?;
        info!("Model deleted: {}", model_path.display());
    }
    Ok(())
}

pub fn get_model_size(app: &AppHandle) -> Option<u64> {
    let model_path = get_model_path(app).ok()?;
    if model_path.exists() {
        calculate_dir_size(&model_path).ok()
    } else {
        None
    }
}

fn calculate_dir_size(path: &Path) -> Result<u64> {
    let mut size = 0;
    for entry in std::fs::read_dir(path)? {
        let entry = entry?;
        let metadata = entry.metadata()?;
        if metadata.is_file() {
            size += metadata.len();
        } else if metadata.is_dir() {
            size += calculate_dir_size(&entry.path())?;
        }
    }
    Ok(size)
}
