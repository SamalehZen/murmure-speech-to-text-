use crate::audio::helpers::{read_wav_samples, PreparedContext};
use crate::audio::types::{AudioState, RecordingMode};
use crate::dictionary::{fix_transcription_with_dictionary, get_cc_rules_path, Dictionary};
use crate::engine::transcription_engine::TranscriptionEngine;
use crate::engine::ParakeetModelParams;
use crate::formatting_rules;
use crate::history;
use crate::llm::providers::{chirp3::Chirp3Client, gemini_live::GeminiLiveSession};
use crate::model::Model;
use crate::settings::TranscriptionMode;
use crate::stats;
use anyhow::{Context, Result};
use log::{debug, error, info, warn};
use std::path::Path;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};

pub fn process_recording(app: &AppHandle, file_path: &Path) -> Result<String> {
    let settings = crate::settings::load_settings(app);

    let (raw_text, is_cloud_mode) = match settings.transcription_mode {
        TranscriptionMode::Offline => (transcribe_with_parakeet(app, file_path)?, false),
        TranscriptionMode::CloudFast => {
            let rt = tokio::runtime::Runtime::new().context("Failed to create tokio runtime")?;
            (rt.block_on(transcribe_with_gemini_live(app, file_path))?, true)
        }
        TranscriptionMode::CloudPrecision => {
            let rt = tokio::runtime::Runtime::new().context("Failed to create tokio runtime")?;
            (
                rt.block_on(transcribe_with_chirp3_parallel(app, file_path))?,
                true,
            )
        }
    };

    debug!("Raw transcription: {}", raw_text);

    if raw_text.trim().is_empty() {
        debug!("Transcription is empty, skipping further processing.");
        return Ok(raw_text);
    }

    let final_text = if is_cloud_mode {
        apply_formatting_rules(app, raw_text)
    } else {
        let text = apply_dictionary_and_rules(app, raw_text)?;
        debug!("Transcription fixed with dictionary: {}", text);

        let llm_text = apply_llm_processing(app, text)?;
        apply_formatting_rules(app, llm_text)
    };

    debug!("Transcription with formatting rules: {}", final_text);
    save_stats_and_history(app, file_path, &final_text)?;

    Ok(final_text)
}

fn transcribe_with_parakeet(app: &AppHandle, audio_path: &Path) -> Result<String> {
    let _ = app.emit("llm-processing-start", ());

    let state = app.state::<AudioState>();

    {
        let mut engine_guard = state.engine.lock();
        if engine_guard.is_none() {
            let model = app.state::<Arc<Model>>();
            let model_path = model
                .get_model_path()
                .map_err(|e| anyhow::anyhow!("Failed to get model path: {}", e))?;

            let mut new_engine = crate::engine::ParakeetEngine::new();
            new_engine
                .load_model_with_params(&model_path, ParakeetModelParams::int8())
                .map_err(|e| anyhow::anyhow!("Failed to load model: {}", e))?;

            *engine_guard = Some(new_engine);
            info!("Model loaded and cached in memory");
        }
    }

    let samples = read_wav_samples(audio_path)?;

    let mut engine_guard = state.engine.lock();
    let engine = engine_guard
        .as_mut()
        .ok_or_else(|| anyhow::anyhow!("Engine not loaded"))?;

    let result = engine.transcribe_samples(samples, None).map_err(|e| {
        let _ = app.emit("llm-processing-end", ());
        anyhow::anyhow!("Transcription failed: {}", e)
    })?;
    let _ = app.emit("llm-processing-end", ());

    Ok(result.text)
}

async fn transcribe_with_gemini_live(app: &AppHandle, file_path: &Path) -> Result<String> {
    let _ = app.emit("llm-processing-start", ());

    let samples = read_wav_samples(file_path)?;
    let llm_settings = crate::llm::load_llm_connect_settings(app);

    let api_key = llm_settings
        .providers
        .get("google")
        .and_then(|p| p.api_key.clone())
        .ok_or_else(|| anyhow::anyhow!("Google API key not configured"))?;

    let system_prompt = get_effective_prompt_for_cloud(app, &llm_settings)
        .unwrap_or_else(|_| "Transcribe and format the following audio.".to_string());

    let session = GeminiLiveSession::new(api_key, system_prompt);
    let result = session
        .transcribe_and_transform(samples, 16000)
        .await
        .map_err(|e| anyhow::anyhow!(e));

    let _ = app.emit("llm-processing-end", ());
    result
}

async fn transcribe_with_chirp3_parallel(app: &AppHandle, file_path: &Path) -> Result<String> {
    let _ = app.emit("llm-processing-start", ());

    let samples = read_wav_samples(file_path)?;
    let sample_rate = 16000u32;

    let llm_settings = crate::llm::load_llm_connect_settings(app);
    let app_clone = app.clone();
    let llm_settings_clone = llm_settings.clone();

    let credentials_path = llm_settings
        .google_cloud_credentials_path
        .clone()
        .ok_or_else(|| anyhow::anyhow!("Google Cloud credentials file not configured"))?;

    let transcription_task = tokio::spawn(async move {
        let chirp3 = Chirp3Client::new(&credentials_path, "us".to_string())?;
        chirp3.transcribe(samples, sample_rate).await
    });

    let context_task = tokio::spawn(async move {
        let window_info = crate::app_context::get_active_window().ok();

        let prompt_template = get_effective_prompt_for_cloud(&app_clone, &llm_settings_clone)
            .unwrap_or_else(|_| "{{TRANSCRIPT}}".to_string());

        PreparedContext {
            prompt_template,
            app_name: window_info.as_ref().map(|w| w.app_name.clone()),
            window_title: window_info.as_ref().map(|w| w.window_title.clone()),
        }
    });

    let (transcription_result, context_result) = tokio::join!(transcription_task, context_task);

    let transcript = transcription_result
        .map_err(|e| anyhow::anyhow!("Transcription task failed: {}", e))?
        .map_err(|e| anyhow::anyhow!("Chirp 3 error: {}", e))?;

    let context = context_result.map_err(|e| anyhow::anyhow!("Context task failed: {}", e))?;

    let final_prompt = context
        .prompt_template
        .replace("{{TRANSCRIPT}}", &transcript)
        .replace("{transcript}", &transcript);

    let provider_config = llm_settings
        .providers
        .get("google")
        .cloned()
        .ok_or_else(|| anyhow::anyhow!("Google provider not configured"))?;

    let result = crate::llm::providers::google::generate(&provider_config, &final_prompt, 0.0)
        .await
        .map_err(|e| anyhow::anyhow!("Gemini LLM error: {}", e))?;

    let _ = app.emit("llm-processing-end", ());
    Ok(result)
}

fn get_effective_prompt_for_cloud(
    app: &AppHandle,
    settings: &crate::llm::LLMConnectSettings,
) -> Result<String, String> {
    let default_prompt = settings
        .modes
        .get(settings.active_mode_index)
        .map(|m| m.prompt.clone())
        .unwrap_or_default();

    if !settings.app_detection_enabled {
        return Ok(default_prompt);
    }

    let window_info = match crate::app_context::get_active_window() {
        Ok(info) => info,
        Err(_) => return Ok(default_prompt),
    };

    let mut rules = settings.app_rules.clone();
    rules.sort_by(|a, b| b.priority.cmp(&a.priority));

    for rule in rules.iter().filter(|r| r.enabled) {
        if rule_matches_window(&window_info, rule) {
            let _ = app.emit(
                "app-context-matched",
                crate::llm::AppContextEvent {
                    app_name: window_info.app_name.clone(),
                    rule_name: rule.name.clone(),
                },
            );
            return Ok(rule.prompt_template.clone());
        }
    }

    Ok(default_prompt)
}

fn rule_matches_window(
    window: &crate::app_context::ActiveWindowInfo,
    rule: &crate::llm::AppPromptRule,
) -> bool {
    match rule.match_type {
        crate::llm::AppMatchType::AppNameContains => window
            .app_name
            .to_lowercase()
            .contains(&rule.match_pattern.to_lowercase()),
        crate::llm::AppMatchType::WindowTitleContains => window
            .window_title
            .to_lowercase()
            .contains(&rule.match_pattern.to_lowercase()),
        crate::llm::AppMatchType::ProcessNameEquals => {
            window.process_name.to_lowercase() == rule.match_pattern.to_lowercase()
        }
        crate::llm::AppMatchType::WindowTitleRegex => regex::Regex::new(&rule.match_pattern)
            .map(|r| r.is_match(&window.window_title))
            .unwrap_or(false),
    }
}

pub fn transcribe_audio(app: &AppHandle, audio_path: &Path) -> Result<String> {
    transcribe_with_parakeet(app, audio_path)
}

fn apply_dictionary_and_rules(app: &AppHandle, text: String) -> Result<String> {
    let cc_rules_path = get_cc_rules_path(app).context("Failed to get CC rules path")?;
    let dictionary = app.state::<Dictionary>().get();

    Ok(fix_transcription_with_dictionary(
        text,
        dictionary,
        cc_rules_path,
    ))
}

fn apply_llm_processing(app: &AppHandle, text: String) -> Result<String> {
    let state = app.state::<AudioState>();
    let recording_mode = state.get_recording_mode();

    let rt = tokio::runtime::Runtime::new().context("Failed to create tokio runtime")?;

    match recording_mode {
        RecordingMode::Command => {
            debug!("Processing audio in Command mode");
            let mut prompt = text.clone();

            match crate::clipboard::get_selected_text(app) {
                Ok(selected_text) => {
                    if !selected_text.trim().is_empty() {
                        debug!("Captured selected text for command mode successfully");
                        prompt = format!("{}\n\n{}", text, selected_text);
                    } else {
                        warn!("Selected text was empty in command mode");
                    }
                }
                Err(e) => {
                    error!("Failed to capture selected text in command mode: {}", e);
                }
            }

            match rt.block_on(crate::llm::process_command_with_llm(app, prompt)) {
                Ok(response) => {
                    debug!("Command processed with LLM: {}", response);
                    Ok(response)
                }
                Err(e) => {
                    warn!(
                        "Command LLM processing failed: {}. Using original transcription.",
                        e
                    );
                    let _ = app.emit("llm-error", e.to_string());
                    Ok(text)
                }
            }
        }
        RecordingMode::Llm => {
            match rt.block_on(crate::llm::post_process_with_llm(
                app,
                text.clone(),
                false,
            )) {
                Ok(llm_text) => {
                    debug!("Transcription post-processed with LLM: {}", llm_text);
                    Ok(llm_text)
                }
                Err(e) => {
                    warn!(
                        "LLM post-processing failed: {}. Using original transcription.",
                        e
                    );
                    let _ = app.emit("llm-error", e.to_string());
                    Ok(text)
                }
            }
        }
        RecordingMode::Standard => Ok(text),
    }
}

fn apply_formatting_rules(app: &AppHandle, text: String) -> String {
    match formatting_rules::load(app) {
        Ok(settings) => formatting_rules::apply_formatting(text, &settings),
        Err(e) => {
            warn!("Failed to load formatting rules: {}. Skipping.", e);
            text
        }
    }
}

fn save_stats_and_history(app: &AppHandle, file_path: &Path, text: &str) -> Result<()> {
    let (duration_seconds, wav_size_bytes) = match hound::WavReader::open(file_path) {
        Ok(reader) => {
            let spec = reader.spec();
            let total_samples = reader.duration() as f64;
            let seconds = if spec.sample_rate > 0 {
                total_samples / (spec.sample_rate as f64)
            } else {
                0.0
            };
            let size = std::fs::metadata(file_path).map(|m| m.len()).unwrap_or(0);
            (seconds, size)
        }
        Err(_) => (0.0, 0),
    };

    let word_count: u64 = text.split_whitespace().filter(|s| !s.is_empty()).count() as u64;

    if let Err(e) = history::add_transcription(app, text.to_string()) {
        error!("Failed to save to history: {}", e);
    }

    if let Err(e) =
        stats::add_transcription_session(app, word_count, duration_seconds, wav_size_bytes)
    {
        error!("Failed to save stats session: {}", e);
    }

    Ok(())
}
