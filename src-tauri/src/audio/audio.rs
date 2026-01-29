use crate::audio::helpers::{cleanup_recordings, ensure_recordings_dir, generate_unique_wav_name};
use crate::audio::pipeline::process_recording;
use crate::audio::recorder::AudioRecorder;
use crate::audio::types::{AudioState, RecordingMode};
use crate::clipboard;
use crate::overlay::overlay;
use crate::app_context::{self, ActiveWindowInfo};
use anyhow::Result;
use log::{debug, error, info, warn};
use once_cell::sync::Lazy;
use parking_lot::Mutex;
use tauri::{AppHandle, Emitter, Manager};

static CAPTURED_WINDOW_INFO: Lazy<Mutex<Option<ActiveWindowInfo>>> = Lazy::new(|| Mutex::new(None));

pub fn capture_active_window_for_command() {
    match app_context::get_active_window() {
        Ok(info) => {
            info!("Captured active window at record start: app='{}', title='{}'", info.app_name, info.window_title);
            *CAPTURED_WINDOW_INFO.lock() = Some(info);
        }
        Err(e) => {
            warn!("Failed to capture active window at record start: {}", e);
            *CAPTURED_WINDOW_INFO.lock() = None;
        }
    }
}

pub fn take_captured_window_info() -> Option<ActiveWindowInfo> {
    CAPTURED_WINDOW_INFO.lock().take()
}

pub fn record_audio(app: &AppHandle) {
    let state = app.state::<AudioState>();
    state.set_recording_mode(RecordingMode::Standard);
    internal_record_audio(app);
}

pub fn record_audio_with_llm(app: &AppHandle) {
    let state = app.state::<AudioState>();
    state.set_recording_mode(RecordingMode::Llm);
    crate::llm::warmup_ollama_model_background(app);
    internal_record_audio(app);
}

pub fn record_audio_with_command(app: &AppHandle) {
    capture_active_window_for_command();
    let state = app.state::<AudioState>();
    state.set_recording_mode(RecordingMode::Command);
    crate::llm::warmup_ollama_model_background(app);
    internal_record_audio(app);
}

fn internal_record_audio(app: &AppHandle) {
    debug!("Starting audio recording...");
    let state = app.state::<AudioState>();

    if state.recorder.lock().is_some() {
        warn!("Already recording");
        return;
    }

    let recordings_dir = match ensure_recordings_dir(app) {
        Ok(dir) => dir,
        Err(e) => {
            error!("Failed to initialize recordings directory: {}", e);
            return;
        }
    };

    let file_name = generate_unique_wav_name();
    let file_path = recordings_dir.join(&file_name);
    *state.current_file_name.lock() = Some(file_name.clone());

    let limit_reached = state.get_limit_reached_arc();

    match AudioRecorder::new(app.clone(), &file_path, limit_reached) {
        Ok(mut recorder) => {
            if let Err(e) = recorder.start() {
                error!("Failed to start recording: {}", e);
                return;
            }
            *state.recorder.lock() = Some(recorder);
            debug!("Recording started");

            let s = crate::settings::load_settings(app);
            if s.overlay_mode.as_str() == "recording" {
                overlay::show_recording_overlay(app);
            }
        }
        Err(e) => {
            error!("Failed to initialize recorder: {}", e);
        }
    }
}

pub fn stop_recording(app: &AppHandle) -> Option<std::path::PathBuf> {
    debug!("Stopping audio recording...");
    let state = app.state::<AudioState>();

    {
        let mut recorder_guard = state.recorder.lock();
        if let Some(recorder) = recorder_guard.as_mut() {
            if let Err(e) = recorder.stop() {
                error!("Failed to stop recorder: {}", e);
            }
        }
        *recorder_guard = None;
    }

    let file_name_opt = state.current_file_name.lock().take();

    if let Some(file_name) = file_name_opt {
        let path = ensure_recordings_dir(app)
            .map(|dir| dir.join(&file_name))
            .ok();

        if let Some(ref p) = path {
            info!(
                "Audio recording stopped; file written to temporary path: {}",
                p.display()
            );

            let app_handle = app.clone();
            let file_path = p.clone();
            tauri::async_runtime::spawn(async move {
                match process_recording(&app_handle, &file_path).await {
                    Ok(final_text) => {
                        if let Err(e) = write_transcription(&app_handle, &final_text) {
                            error!("Failed to use clipboard: {}", e);
                        }
                    }
                    Err(e) => {
                        error!("Processing failed: {}", e);
                        let _ = app_handle.emit("llm-error", e.to_string());
                    }
                }
            });
        }

        let _ = app.emit("mic-level", 0.0f32);
        let s = crate::settings::load_settings(app);
        if s.overlay_mode.as_str() == "recording" {
            overlay::hide_recording_overlay(app);
        }

        return path;
    } else {
        debug!("Recording stopped (no active file)");
    }
    None
}

pub fn write_transcription(app: &AppHandle, transcription: &str) -> Result<()> {
    if let Err(e) = clipboard::paste(transcription, app) {
        error!("Failed to paste text: {}", e);
    }

    if let Err(e) = cleanup_recordings(app) {
        error!("Failed to cleanup recordings: {}", e);
    } else {
        info!("Temporary audio files successfully cleaned up");
    }

    debug!("Transcription written to clipboard {}", transcription);
    Ok(())
}

pub fn write_last_transcription(app: &AppHandle, transcription: &str) -> Result<()> {
    if let Err(e) = clipboard::paste_last_transcript(transcription, app) {
        error!("Failed to paste last transcription: {}", e);
    }

    debug!("Last transcription written to clipboard {}", transcription);
    Ok(())
}
