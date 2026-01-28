use anyhow::{Context, Result};

use hound::{WavSpec, WavWriter};
use log::warn;
use std::fs::File;
use std::io::BufWriter;
use std::path::{Path, PathBuf};
use tauri::Manager;

pub fn ensure_recordings_dir(app: &tauri::AppHandle) -> Result<PathBuf> {
    let recordings = app
        .path()
        .temp_dir()
        .context("Failed to resolve temp dir")?
        .join("murmure_recordings");

    if !recordings.exists() {
        std::fs::create_dir_all(&recordings).context("Failed to create recordings dir")?;
    }

    Ok(recordings)
}

pub fn generate_unique_wav_name() -> String {
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    format!("murmure-{}.wav", ts)
}

pub fn cleanup_recordings(app: &tauri::AppHandle) -> Result<()> {
    let recordings_dir = ensure_recordings_dir(app)?;

    if !recordings_dir.exists() {
        return Ok(());
    }

    let entries =
        std::fs::read_dir(&recordings_dir).context("Failed to read recordings directory")?;

    for entry in entries.flatten() {
        if entry.path().is_file() {
            if let Err(e) = std::fs::remove_file(entry.path()) {
                warn!("Failed to delete {}: {}", entry.path().display(), e);
            }
        }
    }

    Ok(())
}

pub fn create_wav_writer(
    path: &Path,
    config: &cpal::SupportedStreamConfig,
) -> Result<WavWriter<BufWriter<File>>> {
    let file = File::create(path).context("Failed to create WAV file")?;
    let writer = BufWriter::new(file);
    let spec = WavSpec {
        channels: 1,
        sample_rate: config.sample_rate(),
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };
    WavWriter::new(writer, spec).context("Failed to create WAV writer")
}
