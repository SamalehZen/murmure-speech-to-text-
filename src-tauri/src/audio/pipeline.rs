use crate::app_context;
use crate::audio::types::{AudioState, RecordingMode};
use crate::dictionary::{
    fix_transcription_with_dictionary, get_app_specific_dictionary, get_cc_rules_path,
    merge_dictionaries, Dictionary,
};
use crate::formatting_rules;
use crate::history;
use crate::llm::helpers::load_llm_connect_settings;
use crate::llm::providers;
use crate::llm::types::{AppContextEvent, LLMConnectSettings, ToneAppliedEvent, ToneConfig};
use crate::stats;
use anyhow::{Context, Result};
use log::{debug, error, info, warn};
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

fn get_effective_prompt(
    app: &AppHandle,
    settings: &LLMConnectSettings,
) -> Result<Option<String>, String> {
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

    let window_info = match app_context::get_cached_active_window() {
        Ok(info) => info,
        Err(_) => return Ok(Some(default_prompt)),
    };

    let tone = get_tone_for_detected_app(settings, window_info.detected_app.as_deref());

    if let Some(ref t) = tone {
        info!(
            "Matched tone: '{}' for app {:?}",
            t.name, window_info.detected_app
        );
        let _ = app.emit(
            "tone-applied",
            ToneAppliedEvent {
                tone_id: t.id.clone(),
                tone_name: t.name.clone(),
                detected_app: window_info.detected_app.clone(),
            },
        );
    }

    if let Some(rule) = app_context::find_best_matching_rule(&settings.app_rules, &window_info) {
        let _ = app.emit(
            "app-context-matched",
            AppContextEvent {
                app_name: window_info.app_name.clone(),
                rule_name: rule.name.clone(),
            },
        );
        let prompt_with_tone = build_prompt_with_tone(&rule.prompt_template, tone.as_ref());
        return Ok(Some(prompt_with_tone));
    }

    if tone.is_some() {
        let prompt_with_tone = build_prompt_with_tone(&default_prompt, tone.as_ref());
        return Ok(Some(prompt_with_tone));
    }

    Ok(Some(default_prompt))
}

fn get_tone_for_detected_app(
    settings: &LLMConnectSettings,
    detected_app: Option<&str>,
) -> Option<ToneConfig> {
    let tones = if settings.tones.is_empty() {
        ToneConfig::default_tones()
    } else {
        settings.tones.clone()
    };

    if let Some(app_name) = detected_app {
        if let Some(tone_id) = settings.app_tone_overrides.get(app_name) {
            return tones.iter().find(|t| &t.id == tone_id).cloned();
        }

        for tone in &tones {
            if tone.apps.iter().any(|a| a == app_name) {
                return Some(tone.clone());
            }
        }
    }

    settings
        .default_tone_id
        .as_ref()
        .and_then(|id| tones.iter().find(|t| &t.id == id).cloned())
}

fn build_prompt_with_tone(base_prompt: &str, tone: Option<&ToneConfig>) -> String {
    match tone {
        Some(t) => format!(
            "{base_prompt}\n\n<tone>\n{}\n</tone>\n\n<input>{{{{TRANSCRIPT}}}}</input>",
            t.prompt_modifier
        ),
        None => base_prompt.to_string(),
    }
}

fn get_command_mode_prompt(app: &AppHandle) -> Option<(String, String, Option<ToneConfig>)> {
    let settings = load_llm_connect_settings(app);

    if !settings.app_detection_enabled {
        debug!("App detection is disabled for command mode");
        return None;
    }

    let window_info = match crate::audio::audio::take_captured_window_info() {
        Some(info) => {
            info!(
                "Command mode - Using captured window: app='{}', title='{}', process='{}', url={:?}, detected_app={:?}",
                info.app_name, info.window_title, info.process_name, info.browser_url, info.detected_app
            );
            info
        }
        None => {
            warn!("Command mode - No captured window info, trying current window");
            match app_context::get_cached_active_window() {
                Ok(info) => info,
                Err(e) => {
                    warn!("Failed to get active window: {}", e);
                    return None;
                }
            }
        }
    };

    let tone = get_tone_for_detected_app(&settings, window_info.detected_app.as_deref());

    if let Some(ref t) = tone {
        info!(
            "Command mode - Matched tone: '{}' for app {:?}",
            t.name, window_info.detected_app
        );
        let _ = app.emit(
            "tone-applied",
            ToneAppliedEvent {
                tone_id: t.id.clone(),
                tone_name: t.name.clone(),
                detected_app: window_info.detected_app.clone(),
            },
        );
    }

    if let Some(rule) = app_context::find_best_matching_rule(&settings.app_rules, &window_info) {
        info!("Command mode - Matched app rule: '{}'", rule.name);
        let _ = app.emit(
            "app-context-matched",
            AppContextEvent {
                app_name: window_info.app_name.clone(),
                rule_name: rule.name.clone(),
            },
        );
        return Some((rule.name.clone(), rule.prompt_template.clone(), tone));
    }

    if tone.is_some() {
        let default_prompt = settings
            .modes
            .get(settings.active_mode_index)
            .map(|m| m.prompt.clone())
            .unwrap_or_default();
        return Some(("Tone".to_string(), default_prompt, tone));
    }

    debug!(
        "Command mode - No matching app rule or tone found for window: app='{}', title='{}', url={:?}",
        window_info.app_name, window_info.window_title, window_info.browser_url
    );
    None
}

async fn transcribe_and_reformat(app: &AppHandle, audio_path: &Path) -> Result<String> {
    let _ = app.emit("llm-processing-start", ());

    let audio_bytes = std::fs::read(audio_path).context("Failed to read audio file")?;

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
        Some((rule_name, prompt_template, tone)) => {
            info!(
                "Command mode - Using app rule '{}' for transcription + reformulation in ONE API call",
                rule_name
            );

            let context_section = match &selected_text {
                Some(text) => format!("\n\n<selected_text>\n{}\n</selected_text>", text),
                None => String::new(),
            };

            let tone_section = match &tone {
                Some(t) => format!("\n\n<tone>\n{}\n</tone>", t.prompt_modifier),
                None => String::new(),
            };

            let clean_template = prompt_template
                .replace("{{TRANSCRIPT}}", "[THE TRANSCRIBED AUDIO]")
                .replace(
                    "<input>[THE TRANSCRIBED AUDIO]</input>",
                    "[Apply instructions to the transcribed audio]",
                );

            let full_prompt = format!(
                "You will receive an audio file. Your task:\n1. Transcribe the audio accurately\n2. Apply the following reformulation instructions to the transcription\n3. Return ONLY the final reformulated text, nothing else\n\n<reformulation_instructions>\n{}\n</reformulation_instructions>{}{}",
                clean_template,
                tone_section,
                context_section
            );

            Some(full_prompt)
        }
        None => {
            info!("Command mode - No app rule matched, using standard transcription");
            None
        }
    };

    let result =
        providers::google::transcribe_audio(&google_config, audio_bytes, combined_prompt).await;

    let _ = app.emit("llm-processing-end", ());

    result.map_err(|e| anyhow::anyhow!("{}", e))
}

pub async fn transcribe_audio(app: &AppHandle, audio_path: &Path) -> Result<String> {
    let _ = app.emit("llm-processing-start", ());

    let audio_bytes = std::fs::read(audio_path).context("Failed to read audio file")?;

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

    let result =
        providers::google::transcribe_audio(&google_config, audio_bytes, effective_prompt).await;

    let _ = app.emit("llm-processing-end", ());

    result.map_err(|e| anyhow::anyhow!("{}", e))
}

fn apply_dictionary_and_rules(app: &AppHandle, text: String) -> Result<String> {
    let cc_rules_path = get_cc_rules_path(app).context("Failed to get CC rules path")?;
    let global_dictionary = app.state::<Dictionary>().get();
    let app_specific_dictionary = get_app_specific_dictionary(app);
    let merged_dictionary = merge_dictionaries(global_dictionary, app_specific_dictionary);

    Ok(fix_transcription_with_dictionary(
        text,
        merged_dictionary,
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
