use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelDownloadInfo {
    pub name: &'static str,
    pub size_bytes: u64,
    pub url: &'static str,
    pub checksum_sha256: &'static str,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub percentage: f32,
    pub speed_bps: u64,
    pub status: DownloadStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DownloadStatus {
    Pending,
    Downloading,
    Verifying,
    Extracting,
    Completed,
    Failed { error: String },
    Cancelled,
}

pub const PARAKEET_MODEL_INFO: ModelDownloadInfo = ModelDownloadInfo {
    name: "parakeet-tdt-0.6b-v3-int8",
    size_bytes: 350_000_000,
    url: "https://github.com/SamalehZen/murmure-speech-to-text-/releases/download/models/parakeet-tdt-0.6b-v3-int8.zip",
    checksum_sha256: "TO_BE_DETERMINED",
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParakeetStatus {
    pub downloaded: bool,
    pub size_bytes: Option<u64>,
    pub path: Option<String>,
}
