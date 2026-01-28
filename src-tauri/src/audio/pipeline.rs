use crate::audio::types::{AudioState, RecordingMode};
use crate::dictionary::{fix_transcription_with_dictionary, get_cc_rules_path, Dictionary};
use crate::formatting_rules;
use crate::history;
use crate::llm::helpers::load_llm_connect_settings;
use crate::llm::providers;
use crate::llm::types::{AppContextEvent, AppMatchType, AppPromptRule, LLMConnectSettings};
use crate::stats;
use crate::{app_context, llm};
use anyhow::{Context, Result};
use log::{debug, error, warn};
use regex::Regex;
use std::path::Path;
use tauri::{AppHandle, Emitter, Manager};

pub async fn process_recording(app: &AppHandle, file_path: &Path) -> Result<String> {
    let raw_text = transcribe_audio(app, file_path).await?;
    debug!("Raw transcription: {}", raw_text);

    if raw_text.trim().is_empty() {
        debug!("Transcription is empty, skipping further processing.");
        return Ok(raw_text);
    }

    let text = apply_dictionary_and_rules(app, raw_text)?;
    debug!("Transcription fixed with dictionary: {}", text);

    let state = app.state::<AudioState>();
    let llm_text = if state.get_recording_mode() == RecordingMode::Command {
        apply_llm_processing(app, text)?
    } else {
        text
    };

    let final_text = apply_formatting_rules(app, llm_text);
    debug!("Transcription with formatting rules: {}", final_text);

    save_stats_and_history(app, file_path, &final_text)?;

    Ok(final_text)
}

fn rule_matches(window: &app_context::ActiveWindowInfo, rule: &AppPromptRule) -> bool {
    match rule.match_type {
        AppMatchType::AppNameContains => window
            .app_name
            .to_lowercase()
            .contains(&rule.match_pattern.to_lowercase()),
        AppMatchType::WindowTitleContains => window
            .window_title
            .to_lowercase()
            .contains(&rule.match_pattern.to_lowercase()),
        AppMatchType::ProcessNameEquals => {
            window.process_name.to_lowercase() == rule.match_pattern.to_lowercase()
        }
        AppMatchType::WindowTitleRegex => Regex::new(&rule.match_pattern)
            .map(|r| r.is_match(&window.window_title))
            .unwrap_or(false),
    }
}

fn get_effective_prompt(app: &AppHandle, settings: &LLMConnectSettings) -> Result<Option<String>, String> {
    if !settings.app_detection_enabled {
        return Ok(None);
    }

    let default_prompt = settings
        .modes
        .get(settings.active_mode_index)
        .map(|m| m.prompt.clone())
        .unwrap_or_default();

    if default_prompt.is_empty() {
        return Ok(None);
    }

    let window_info = match app_context::get_active_window() {
        Ok(info) => info,
        Err(_) => return Ok(Some(default_prompt)),
    };

    let mut rules = settings.app_rules.clone();
    rules.sort_by(|a, b| b.priority.cmp(&a.priority));

    for rule in rules.iter().filter(|r| r.enabled) {
        if rule_matches(&window_info, rule) {
            let _ = app.emit(
                "app-context-matched",
                AppContextEvent {
                    app_name: window_info.app_name.clone(),
                    rule_name: rule.name.clone(),
                },
            );
            return Ok(Some(rule.prompt_template.clone()));
        }
    }

    Ok(Some(default_prompt))
}

pub async fn transcribe_audio(app: &AppHandle, audio_path: &Path) -> Result<String> {
    let _ = app.emit("llm-processing-start", ());

    let audio_bytes = std::fs::read(audio_path)
        .context("Failed to read audio file")?;

    let settings = load_llm_connect_settings(app);
    let google_config = settings
        .providers
        .get("google")
        .cloned()
        .ok_or_else(|| anyhow::anyhow!("Google provider not configured"))?;

    if google_config.api_key.is_none() {
        let _ = app.emit("llm-processing-end", ());
        return Err(anyhow::anyhow!(
            "Google API key not configured. Go to Settings > LLM Connect to configure."
        ));
    }

    let effective_prompt = get_effective_prompt(app, &settings)
        .map_err(|e| anyhow::anyhow!("Failed to get effective prompt: {}", e))?;

    let result = providers::google::transcribe_audio(&google_config, audio_bytes, effective_prompt).await;

    let _ = app.emit("llm-processing-end", ());

    result.map_err(|e| anyhow::anyhow!("{}", e))
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

            match rt.block_on(llm::process_command_with_llm(app, prompt)) {
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
        RecordingMode::Llm | RecordingMode::Standard => {
            Ok(text)
        }
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
