use crate::model::download::{DownloadProgress, DownloadStatus, PARAKEET_MODEL_INFO};
use futures_util::StreamExt;
use log::{debug, info, warn};
use sha2::{Digest, Sha256};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager};
use thiserror::Error;
use tokio::io::AsyncWriteExt;

const MODELS_DIR: &str = "models";
const MODEL_FILENAME: &str = "parakeet-tdt-0.6b-v3-int8";

#[derive(Debug, Error)]
pub enum DownloadError {
    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("HTTP error: status {0}")]
    HttpStatus(u16),
    #[error("Checksum mismatch: expected {expected}, got {actual}")]
    ChecksumMismatch { expected: String, actual: String },
    #[error("Download cancelled")]
    Cancelled,
    #[error("Zip extraction error: {0}")]
    Zip(#[from] zip::result::ZipError),
    #[error("Path error: {0}")]
    Path(String),
}

pub struct DownloadCancelFlag(pub Arc<AtomicBool>);

impl DownloadCancelFlag {
    pub fn new() -> Self {
        Self(Arc::new(AtomicBool::new(false)))
    }

    pub fn cancel(&self) {
        self.0.store(true, Ordering::SeqCst);
    }

    pub fn reset(&self) {
        self.0.store(false, Ordering::SeqCst);
    }

    pub fn is_cancelled(&self) -> bool {
        self.0.load(Ordering::SeqCst)
    }
}

impl Default for DownloadCancelFlag {
    fn default() -> Self {
        Self::new()
    }
}

pub struct ModelDownloadManager {
    app: AppHandle,
}

impl ModelDownloadManager {
    pub fn new(app: AppHandle) -> Self {
        Self { app }
    }

    fn get_models_dir(&self) -> Result<PathBuf, DownloadError> {
        let app_data = self
            .app
            .path()
            .app_data_dir()
            .map_err(|e| DownloadError::Path(e.to_string()))?;
        Ok(app_data.join(MODELS_DIR))
    }

    pub fn get_model_path(&self) -> Option<PathBuf> {
        let models_dir = self.get_models_dir().ok()?;
        let model_path = models_dir.join(MODEL_FILENAME);
        if model_path.exists() {
            Some(model_path)
        } else {
            None
        }
    }

    pub fn is_downloaded(&self) -> bool {
        self.get_model_path().is_some()
    }

    fn emit_progress(&self, progress: &DownloadProgress) {
        if let Err(e) = self.app.emit("model-download-progress", progress) {
            warn!("Failed to emit download progress: {}", e);
        }
    }

    fn emit_error(&self, error: &str) {
        if let Err(e) = self.app.emit("model-download-error", error) {
            warn!("Failed to emit download error: {}", e);
        }
    }

    pub async fn download_parakeet(
        &self,
        cancel_flag: &DownloadCancelFlag,
    ) -> Result<(), DownloadError> {
        cancel_flag.reset();

        let models_dir = self.get_models_dir()?;
        std::fs::create_dir_all(&models_dir)?;

        let zip_path = models_dir.join(format!("{}.zip", MODEL_FILENAME));

        self.emit_progress(&DownloadProgress {
            downloaded_bytes: 0,
            total_bytes: PARAKEET_MODEL_INFO.size_bytes,
            percentage: 0.0,
            speed_bps: 0,
            status: DownloadStatus::Pending,
        });

        info!("Starting download from: {}", PARAKEET_MODEL_INFO.url);

        let client = reqwest::Client::new();
        let response = client.get(PARAKEET_MODEL_INFO.url).send().await?;

        if !response.status().is_success() {
            let status = response.status().as_u16();
            let err = DownloadError::HttpStatus(status);
            self.emit_error(&err.to_string());
            self.emit_progress(&DownloadProgress {
                downloaded_bytes: 0,
                total_bytes: PARAKEET_MODEL_INFO.size_bytes,
                percentage: 0.0,
                speed_bps: 0,
                status: DownloadStatus::Failed {
                    error: err.to_string(),
                },
            });
            return Err(err);
        }

        let total_size = response
            .content_length()
            .unwrap_or(PARAKEET_MODEL_INFO.size_bytes);

        let mut file = tokio::fs::File::create(&zip_path).await?;
        let mut stream = response.bytes_stream();

        let mut downloaded: u64 = 0;
        let mut hasher = Sha256::new();
        let start_time = Instant::now();
        let mut last_emit = Instant::now();

        while let Some(chunk_result) = stream.next().await {
            if cancel_flag.is_cancelled() {
                drop(file);
                let _ = tokio::fs::remove_file(&zip_path).await;
                self.emit_progress(&DownloadProgress {
                    downloaded_bytes: downloaded,
                    total_bytes: total_size,
                    percentage: (downloaded as f32 / total_size as f32) * 100.0,
                    speed_bps: 0,
                    status: DownloadStatus::Cancelled,
                });
                return Err(DownloadError::Cancelled);
            }

            let chunk = match chunk_result {
                Ok(c) => c,
                Err(e) => {
                    drop(file);
                    let _ = tokio::fs::remove_file(&zip_path).await;
                    let err = DownloadError::Network(e);
                    self.emit_error(&err.to_string());
                    self.emit_progress(&DownloadProgress {
                        downloaded_bytes: downloaded,
                        total_bytes: total_size,
                        percentage: (downloaded as f32 / total_size as f32) * 100.0,
                        speed_bps: 0,
                        status: DownloadStatus::Failed {
                            error: err.to_string(),
                        },
                    });
                    return Err(err);
                }
            };

            file.write_all(&chunk).await?;
            hasher.update(&chunk);
            downloaded += chunk.len() as u64;

            if last_emit.elapsed().as_millis() >= 100 {
                let elapsed = start_time.elapsed().as_secs_f64();
                let speed_bps = if elapsed > 0.0 {
                    (downloaded as f64 / elapsed) as u64
                } else {
                    0
                };

                self.emit_progress(&DownloadProgress {
                    downloaded_bytes: downloaded,
                    total_bytes: total_size,
                    percentage: (downloaded as f32 / total_size as f32) * 100.0,
                    speed_bps,
                    status: DownloadStatus::Downloading,
                });
                last_emit = Instant::now();
            }
        }

        file.flush().await?;
        drop(file);

        self.emit_progress(&DownloadProgress {
            downloaded_bytes: downloaded,
            total_bytes: total_size,
            percentage: 100.0,
            speed_bps: 0,
            status: DownloadStatus::Verifying,
        });

        let checksum = format!("{:x}", hasher.finalize());
        debug!("Downloaded file checksum: {}", checksum);

        if PARAKEET_MODEL_INFO.checksum_sha256 != "TO_BE_DETERMINED"
            && checksum != PARAKEET_MODEL_INFO.checksum_sha256
        {
            let _ = tokio::fs::remove_file(&zip_path).await;
            let err = DownloadError::ChecksumMismatch {
                expected: PARAKEET_MODEL_INFO.checksum_sha256.to_string(),
                actual: checksum,
            };
            self.emit_error(&err.to_string());
            self.emit_progress(&DownloadProgress {
                downloaded_bytes: downloaded,
                total_bytes: total_size,
                percentage: 100.0,
                speed_bps: 0,
                status: DownloadStatus::Failed {
                    error: err.to_string(),
                },
            });
            return Err(err);
        }

        self.emit_progress(&DownloadProgress {
            downloaded_bytes: downloaded,
            total_bytes: total_size,
            percentage: 100.0,
            speed_bps: 0,
            status: DownloadStatus::Extracting,
        });

        info!(
            "Extracting model to: {}",
            models_dir.join(MODEL_FILENAME).display()
        );

        let zip_path_clone = zip_path.clone();
        let models_dir_clone = models_dir.clone();
        let extract_result = tokio::task::spawn_blocking(move || {
            let file = std::fs::File::open(&zip_path_clone)?;
            let mut archive = zip::ZipArchive::new(file)?;

            for i in 0..archive.len() {
                let mut file = archive.by_index(i)?;
                let outpath = match file.enclosed_name() {
                    Some(path) => models_dir_clone.join(path),
                    None => continue,
                };

                if file.is_dir() {
                    std::fs::create_dir_all(&outpath)?;
                } else {
                    if let Some(parent) = outpath.parent() {
                        if !parent.exists() {
                            std::fs::create_dir_all(parent)?;
                        }
                    }
                    let mut outfile = std::fs::File::create(&outpath)?;
                    std::io::copy(&mut file, &mut outfile)?;
                }
            }

            std::fs::remove_file(&zip_path_clone)?;
            Ok::<(), DownloadError>(())
        })
        .await;

        match extract_result {
            Ok(Ok(())) => {}
            Ok(Err(e)) => {
                self.emit_error(&e.to_string());
                self.emit_progress(&DownloadProgress {
                    downloaded_bytes: downloaded,
                    total_bytes: total_size,
                    percentage: 100.0,
                    speed_bps: 0,
                    status: DownloadStatus::Failed {
                        error: e.to_string(),
                    },
                });
                return Err(e);
            }
            Err(e) => {
                let err = DownloadError::Path(e.to_string());
                self.emit_error(&err.to_string());
                self.emit_progress(&DownloadProgress {
                    downloaded_bytes: downloaded,
                    total_bytes: total_size,
                    percentage: 100.0,
                    speed_bps: 0,
                    status: DownloadStatus::Failed {
                        error: err.to_string(),
                    },
                });
                return Err(err);
            }
        }

        self.emit_progress(&DownloadProgress {
            downloaded_bytes: downloaded,
            total_bytes: total_size,
            percentage: 100.0,
            speed_bps: 0,
            status: DownloadStatus::Completed,
        });

        if let Err(e) = self.app.emit("model-download-complete", ()) {
            warn!("Failed to emit download complete event: {}", e);
        }

        info!("Model download and extraction completed successfully");
        Ok(())
    }

    pub async fn delete_parakeet(&self) -> Result<(), DownloadError> {
        if let Some(model_path) = self.get_model_path() {
            info!("Deleting model at: {}", model_path.display());
            tokio::fs::remove_dir_all(&model_path).await?;
            info!("Model deleted successfully");
        }
        Ok(())
    }

    pub fn get_model_size(&self) -> Option<u64> {
        let model_path = self.get_model_path()?;
        calculate_dir_size(&model_path).ok()
    }
}

fn calculate_dir_size(path: &PathBuf) -> std::io::Result<u64> {
    let mut size = 0;
    if path.is_dir() {
        for entry in std::fs::read_dir(path)? {
            let entry = entry?;
            let metadata = entry.metadata()?;
            if metadata.is_dir() {
                size += calculate_dir_size(&entry.path())?;
            } else {
                size += metadata.len();
            }
        }
    }
    Ok(size)
}
