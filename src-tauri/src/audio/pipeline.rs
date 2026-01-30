use crate::audio::types::{AudioState, RecordingMode};
use crate::dictionary::{fix_transcription_with_dictionary, get_cc_rules_path, Dictionary};
use crate::formatting_rules;
use crate::history;
use crate::llm::helpers::load_llm_connect_settings;
use crate::llm::providers;
use crate::llm::types::{AppContextEvent, AppMatchType, AppPromptRule, LLMConnectSettings};
use crate::stats;
use crate::app_context::{self, AppCategory};
use anyhow::{Context, Result};
use log::{debug, error, info, warn};
use regex::Regex;
use std::path::Path;
use tauri::{AppHandle, Emitter, Manager};

pub async fn process_recording(app: &AppHandle, file_path: &Path) -> Result<String> {
    let state = app.state::<AudioState>();
    let recording_mode = state.get_recording_mode();

    let raw_text = if recording_mode == RecordingMode::Command {
        debug!("Command mode detected - using single API call for transcription + reformulation");
        transcribe_and_reformat(app, file_path).await?
    } else {
        transcribe_audio(app, file_path).await?
    };

    debug!("Transcription result: {}", raw_text);

    if raw_text.trim().is_empty() {
        debug!("Transcription is empty, skipping further processing.");
        return Ok(raw_text);
    }

    let text = if recording_mode == RecordingMode::Command {
        raw_text
    } else {
        apply_dictionary_and_rules(app, raw_text)?
    };

    let final_text = apply_formatting_rules(app, text);
    debug!("Final text with formatting rules: {}", final_text);

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
        AppMatchType::UrlContains => window
            .url
            .as_ref()
            .map(|url| url.to_lowercase().contains(&rule.match_pattern.to_lowercase()))
            .unwrap_or(false),
        AppMatchType::BundleIdEquals => window
            .bundle_id
            .as_ref()
            .map(|bid| bid.to_lowercase() == rule.match_pattern.to_lowercase())
            .unwrap_or(false),
    }
}

fn matches_url_pattern(url: &str, rule: &AppPromptRule) -> bool {
    let url_lower = url.to_lowercase();
    let pattern_lower = rule.match_pattern.to_lowercase();
    
    match rule.match_type {
        AppMatchType::WindowTitleContains | AppMatchType::AppNameContains => {
            url_lower.contains(&pattern_lower)
        }
        AppMatchType::WindowTitleRegex => {
            Regex::new(&rule.match_pattern)
                .map(|r| r.is_match(url))
                .unwrap_or(false)
        }
        _ => false,
    }
}

fn get_automatic_detection_prompt(window_info: &app_context::ActiveWindowInfo) -> Option<(String, String, AppCategory)> {
    let category = app_context::classify_app(window_info);
    
    if category == AppCategory::Default || category == AppCategory::Browser {
        return None;
    }
    
    let prompt = app_context::get_prompt_for_category(category)?;
    let rule_name = format!("Auto: {}", app_context::get_category_name(category));
    
    Some((rule_name, prompt.to_string(), category))
}

fn get_effective_prompt(app: &AppHandle, settings: &LLMConnectSettings) -> Result<Option<String>, String> {
    let window_info = match app_context::get_active_window() {
        Ok(info) => {
            debug!(
                "Detected window: app='{}', title='{}', process='{}', url={:?}, bundle_id={:?}",
                info.app_name, info.window_title, info.process_name, info.url, info.bundle_id
            );
            info
        }
        Err(e) => {
            debug!("Failed to get active window: {}", e);
            return Ok(None);
        }
    };

    if !settings.app_rules.is_empty() {
        let mut rules = settings.app_rules.clone();
        rules.sort_by(|a, b| b.priority.cmp(&a.priority));

        for rule in rules.iter().filter(|r| r.enabled) {
            let url_match = window_info.url.as_ref()
                .map(|url| matches_url_pattern(url, rule))
                .unwrap_or(false);
            
            if rule_matches(&window_info, rule) || url_match {
                let _ = app.emit(
                    "app-context-matched",
                    AppContextEvent {
                        app_name: window_info.app_name.clone(),
                        rule_name: rule.name.clone(),
                    },
                );
                info!("Custom rule matched: '{}'", rule.name);
                return Ok(Some(rule.prompt_template.clone()));
            }
        }
    }

    if let Some((rule_name, prompt, category)) = get_automatic_detection_prompt(&window_info) {
        let _ = app.emit(
            "app-context-matched",
            AppContextEvent {
                app_name: window_info.app_name.clone(),
                rule_name: rule_name.clone(),
            },
        );
        info!("Automatic detection matched: '{}' (category: {:?})", rule_name, category);
        return Ok(Some(prompt));
    }

    Ok(None)
}

fn get_command_mode_prompt(app: &AppHandle) -> Option<(String, String)> {
    let settings = load_llm_connect_settings(app);

    let window_info = match crate::audio::audio::take_captured_window_info() {
        Some(info) => {
            info!(
                "Command mode - Using captured window: app='{}', title='{}', process='{}', url={:?}",
                info.app_name, info.window_title, info.process_name, info.url
            );
            info
        }
        None => {
            warn!("Command mode - No captured window info, trying current window");
            match app_context::get_active_window() {
                Ok(info) => info,
                Err(e) => {
                    warn!("Failed to get active window: {}", e);
                    return None;
                }
            }
        }
    };

    if !settings.app_rules.is_empty() {
        let mut rules = settings.app_rules.clone();
        rules.sort_by(|a, b| b.priority.cmp(&a.priority));

        for rule in rules.iter().filter(|r| r.enabled) {
            let url_match = window_info.url.as_ref()
                .map(|url| matches_url_pattern(url, rule))
                .unwrap_or(false);
            
            if rule_matches(&window_info, rule) || url_match {
                info!("Command mode - Custom rule matched: '{}'", rule.name);
                let _ = app.emit(
                    "app-context-matched",
                    AppContextEvent {
                        app_name: window_info.app_name.clone(),
                        rule_name: rule.name.clone(),
                    },
                );
                return Some((rule.name.clone(), rule.prompt_template.clone()));
            }
        }
    }

    if let Some((rule_name, prompt, category)) = get_automatic_detection_prompt(&window_info) {
        let _ = app.emit(
            "app-context-matched",
            AppContextEvent {
                app_name: window_info.app_name.clone(),
                rule_name: rule_name.clone(),
            },
        );
        info!("Command mode - Automatic detection matched: '{}' (category: {:?})", rule_name, category);
        return Some((rule_name, prompt));
    }

    debug!("Command mode - No matching rule found for window: app='{}', title='{}'", 
           window_info.app_name, window_info.window_title);
    None
}

async fn transcribe_and_reformat(app: &AppHandle, audio_path: &Path) -> Result<String> {
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

    let selected_text = match crate::clipboard::get_selected_text(app) {
        Ok(text) if !text.trim().is_empty() => {
            debug!("Command mode - captured selected text for context");
            Some(text)
        }
        Ok(_) => {
            debug!("Command mode - no selected text");
            None
        }
        Err(e) => {
            warn!("Command mode - failed to get selected text: {}", e);
            None
        }
    };

    let combined_prompt = match get_command_mode_prompt(app) {
        Some((rule_name, prompt_template)) => {
            info!("Command mode - Using rule '{}' for transcription + reformulation in ONE API call", rule_name);
            
            let context_section = match &selected_text {
                Some(text) => format!("\n\n<selected_text>\n{}\n</selected_text>", text),
                None => String::new(),
            };

            let clean_template = prompt_template
                .replace("{{TRANSCRIPT}}", "[THE TRANSCRIBED AUDIO]")
                .replace("<input>[THE TRANSCRIBED AUDIO]</input>", "[Apply instructions to the transcribed audio]");

            let full_prompt = format!(
                "You will receive an audio file. Your task:\n1. Transcribe the audio accurately\n2. Apply the following reformulation instructions to the transcription\n3. Return ONLY the final reformulated text, nothing else\n\n<reformulation_instructions>\n{}\n</reformulation_instructions>{}",
                clean_template,
                context_section
            );
            
            Some(full_prompt)
        }
        None => {
            info!("Command mode - No rule matched, using standard transcription");
            None
        }
    };

    let result = providers::google::transcribe_audio(&google_config, audio_bytes, combined_prompt).await;

    let _ = app.emit("llm-processing-end", ());

    result.map_err(|e| anyhow::anyhow!("{}", e))
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
