use crate::audio::helpers::{cleanup_recordings, ensure_recordings_dir, generate_unique_wav_name};
use crate::audio::pipeline::process_recording;
use crate::audio::recorder::AudioRecorder;
use crate::audio::types::{AudioState, RecordingMode};
use crate::clipboard;
use crate::overlay::overlay;
use crate::app_context::{self, ActiveWindowInfo, AppCategory};
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

pub fn emit_detected_app(app: &AppHandle) {
    match app_context::get_active_window() {
        Ok(info) => {
            let category = app_context::classify_app(&info);
            let icon_key = get_icon_key_for_app(&info, category);
            debug!("Detected app for overlay: {} (category: {:?}, icon: {})", info.app_name, category, icon_key);
            let _ = app.emit("detected-app", DetectedAppEvent {
                app_name: info.app_name,
                category: format!("{:?}", category).to_lowercase(),
                icon_key,
            });
        }
        Err(e) => {
            debug!("Failed to detect app for overlay: {}", e);
            let _ = app.emit("detected-app", DetectedAppEvent {
                app_name: String::new(),
                category: "default".to_string(),
                icon_key: "default".to_string(),
            });
        }
    }
}

#[derive(Clone, serde::Serialize)]
struct DetectedAppEvent {
    app_name: String,
    category: String,
    icon_key: String,
}

fn get_icon_key_for_app(info: &ActiveWindowInfo, category: AppCategory) -> String {
    let app_lower = info.app_name.to_lowercase();
    let url_lower = info.url.as_deref().unwrap_or("").to_lowercase();
    let title_lower = info.window_title.to_lowercase();
    
    if url_lower.contains("mail.google.com") || url_lower.contains("gmail") {
        return "gmail".to_string();
    }
    if url_lower.contains("outlook") || app_lower.contains("outlook") {
        return "outlook".to_string();
    }
    if url_lower.contains("slack.com") || app_lower.contains("slack") {
        return "slack".to_string();
    }
    if url_lower.contains("discord") || app_lower.contains("discord") {
        return "discord".to_string();
    }
    if url_lower.contains("whatsapp") || app_lower.contains("whatsapp") {
        return "whatsapp".to_string();
    }
    if url_lower.contains("telegram") || app_lower.contains("telegram") {
        return "telegram".to_string();
    }
    if url_lower.contains("notion") || app_lower.contains("notion") {
        return "notion".to_string();
    }
    if url_lower.contains("github") || app_lower.contains("github") {
        return "github".to_string();
    }
    if url_lower.contains("linear") || app_lower.contains("linear") {
        return "linear".to_string();
    }
    if url_lower.contains("jira") || url_lower.contains("atlassian") || app_lower.contains("jira") {
        return "jira".to_string();
    }
    if url_lower.contains("figma") || app_lower.contains("figma") {
        return "figma".to_string();
    }
    if url_lower.contains("youtube") || app_lower.contains("youtube") {
        return "youtube".to_string();
    }
    if url_lower.contains("spotify") || app_lower.contains("spotify") {
        return "spotify".to_string();
    }
    if url_lower.contains("twitter") || url_lower.contains("x.com") || app_lower.contains("twitter") {
        return "twitter".to_string();
    }
    if url_lower.contains("linkedin") || app_lower.contains("linkedin") {
        return "linkedin".to_string();
    }
    if url_lower.contains("amazon") || app_lower.contains("amazon") {
        return "amazon".to_string();
    }
    if url_lower.contains("docs.google") {
        return "docs".to_string();
    }
    if app_lower.contains("code") || app_lower.contains("vscode") || title_lower.contains("visual studio") {
        return "vscode".to_string();
    }
    if app_lower.contains("terminal") || app_lower.contains("iterm") || app_lower.contains("warp") 
       || app_lower.contains("alacritty") || app_lower.contains("kitty") {
        return "terminal".to_string();
    }
    if app_lower.contains("chrome") || app_lower.contains("firefox") || app_lower.contains("safari")
       || app_lower.contains("edge") || app_lower.contains("brave") {
        return "browser".to_string();
    }
    
    match category {
        AppCategory::Email => "email".to_string(),
        AppCategory::Chat => "chat".to_string(),
        AppCategory::Code => "code".to_string(),
        AppCategory::Terminal => "terminal".to_string(),
        AppCategory::Notes => "notes".to_string(),
        AppCategory::Design => "design".to_string(),
        AppCategory::Music => "music".to_string(),
        AppCategory::Video => "video".to_string(),
        AppCategory::Social => "social".to_string(),
        AppCategory::Shopping => "shopping".to_string(),
        AppCategory::Office => "office".to_string(),
        AppCategory::Productivity => "productivity".to_string(),
        AppCategory::Browser => "browser".to_string(),
        _ => "default".to_string(),
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

            emit_detected_app(app);

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
