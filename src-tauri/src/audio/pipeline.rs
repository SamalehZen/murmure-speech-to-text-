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
use crate::llm::templates::{detect_and_apply_template, load_template_settings};
use crate::llm::types::{
    AppContextEvent, LLMConnectSettings, TemplateAppliedEvent, ToneAppliedEvent, ToneConfig,
};
use crate::stats;
use crate::style_learning::{
    analyze_text, generate_style_prompt, load_style_learning_settings, merge_patterns,
    save_style_learning_settings, StyleProfile,
};
use crate::voice_commands::{load_voice_command_settings, CommandParser};
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

    if let Some(template_content) = check_and_apply_template(app, &raw_text) {
        debug!("Template applied, returning template content");
        save_stats_and_history(app, file_path, &template_content)?;
        return Ok(template_content);
    }

    let text_after_commands = apply_voice_commands(app, raw_text);

    let text = if recording_mode == RecordingMode::Command {
        text_after_commands
    } else {
        apply_dictionary_and_rules(app, text_after_commands)?
    };

    let final_text = apply_formatting_rules(app, text);
    debug!("Final text with formatting rules: {}", final_text);

    save_stats_and_history(app, file_path, &final_text)?;

    record_for_style_learning(app, &final_text);

    Ok(final_text)
}

fn check_and_apply_template(app: &AppHandle, text: &str) -> Option<String> {
    let template_settings = load_template_settings(app);

    if !template_settings.enabled {
        return None;
    }

    let templates = if template_settings.templates.is_empty() {
        crate::llm::types::TextTemplate::default_templates()
    } else {
        template_settings.templates
    };

    let detected_app = get_detected_app_name(app);

    match detect_and_apply_template(text, detected_app.as_deref(), &templates) {
        Some(template) => {
            info!(
                "Template '{}' matched for app {:?}",
                template.name, detected_app
            );
            let _ = app.emit(
                "template-applied",
                TemplateAppliedEvent {
                    template_id: template.id.clone(),
                    template_name: template.name.clone(),
                    detected_app,
                },
            );
            Some(template.content)
        }
        None => None,
    }
}

fn get_detected_app_name(app: &AppHandle) -> Option<String> {
    match crate::audio::audio::take_captured_window_info() {
        Some(info) => info.detected_app,
        None => match app_context::get_cached_active_window() {
            Ok(info) => info.detected_app,
            Err(_) => None,
        },
    }
}

fn apply_voice_commands(app: &AppHandle, text: String) -> String {
    let settings = load_voice_command_settings(app);

    if !settings.enabled {
        return text;
    }

    let mut parser = CommandParser::new(settings.commands.clone());
    let parsed = parser.parse(&text, &settings);

    if parsed.contains("[CLEAR]") {
        debug!("Voice command: CLEAR detected, returning empty string");
        let _ = app.emit("voice-command-executed", "clear_all");
        return String::new();
    }

    if parsed.contains("[UNDO]") {
        debug!("Voice command: UNDO detected");
        let _ = app.emit("voice-command-undo", ());
        let _ = app.emit("voice-command-executed", "undo");
        return parsed.replace("[UNDO]", "");
    }

    let _ = app.emit("voice-command-executed", "parsed");
    debug!("Text after voice commands: {}", parsed);
    parsed
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
        let prompt_with_style =
            build_prompt_with_style(app, prompt_with_tone, window_info.detected_app.as_deref());
        return Ok(Some(prompt_with_style));
    }

    if tone.is_some() {
        let prompt_with_tone = build_prompt_with_tone(&default_prompt, tone.as_ref());
        let prompt_with_style =
            build_prompt_with_style(app, prompt_with_tone, window_info.detected_app.as_deref());
        return Ok(Some(prompt_with_style));
    }

    let prompt_with_style =
        build_prompt_with_style(app, default_prompt, window_info.detected_app.as_deref());
    Ok(Some(prompt_with_style))
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

fn build_prompt_with_style(
    app: &AppHandle,
    prompt: String,
    detected_app: Option<&str>,
) -> String {
    let style_settings = load_style_learning_settings(app);

    if !style_settings.enabled {
        return prompt;
    }

    let app_name = match detected_app {
        Some(name) => name,
        None => return prompt,
    };

    if style_settings.excluded_apps.contains(&app_name.to_string()) {
        return prompt;
    }

    match style_settings.profiles.get(app_name) {
        Some(profile)
            if profile.enabled
                && profile.sample_count >= style_settings.min_samples_for_learning =>
        {
            let style_prompt = generate_style_prompt(&profile.patterns);
            if style_prompt.is_empty() {
                prompt
            } else {
                info!("Style learning - Applying learned style for app '{}'", app_name);
                format!("{}\n\n{}", prompt, style_prompt)
            }
        }
        _ => prompt,
    }
}

fn record_for_style_learning(app: &AppHandle, text: &str) {
    let style_settings = load_style_learning_settings(app);

    if !style_settings.enabled {
        return;
    }

    let detected_app = match get_detected_app_name(app) {
        Some(name) => name,
        None => return,
    };

    if style_settings.excluded_apps.contains(&detected_app) {
        debug!("Style learning - App '{}' is excluded", detected_app);
        return;
    }

    if text.trim().len() < 10 {
        debug!("Style learning - Text too short to learn from");
        return;
    }

    let mut settings = style_settings;
    let profile = settings
        .profiles
        .entry(detected_app.clone())
        .or_insert_with(|| StyleProfile::new(&detected_app));

    let new_patterns = analyze_text(text);
    let weight = (1.0 / (profile.sample_count as f32 + 1.0)).min(0.5);
    profile.patterns = merge_patterns(&profile.patterns, &new_patterns, weight);

    profile.examples.push(text.to_string());
    if profile.examples.len() > settings.max_examples_stored as usize {
        profile.examples.remove(0);
    }

    profile.sample_count += 1;
    profile.last_updated = chrono::Utc::now().to_rfc3339();

    if let Err(e) = save_style_learning_settings(app, &settings) {
        error!("Failed to save style learning data: {}", e);
    } else {
        debug!(
            "Style learning - Recorded sample #{} for app '{}'",
            profile.sample_count, detected_app
        );
    }
}

fn get_style_section_for_command_mode(app: &AppHandle, detected_app: Option<&str>) -> String {
    let style_settings = load_style_learning_settings(app);

    if !style_settings.enabled {
        return String::new();
    }

    let app_name = match detected_app {
        Some(name) => name,
        None => return String::new(),
    };

    if style_settings.excluded_apps.contains(&app_name.to_string()) {
        return String::new();
    }

    match style_settings.profiles.get(app_name) {
        Some(profile)
            if profile.enabled
                && profile.sample_count >= style_settings.min_samples_for_learning =>
        {
            let style_prompt = generate_style_prompt(&profile.patterns);
            if style_prompt.is_empty() {
                String::new()
            } else {
                info!(
                    "Command mode - Applying learned style for app '{}'",
                    app_name
                );
                format!("\n\n{}", style_prompt)
            }
        }
        _ => String::new(),
    }
}

fn get_command_mode_prompt(
    app: &AppHandle,
) -> Option<(String, String, Option<ToneConfig>, Option<String>)> {
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

    let detected_app = window_info.detected_app.clone();
    let tone = get_tone_for_detected_app(&settings, detected_app.as_deref());

    if let Some(ref t) = tone {
        info!(
            "Command mode - Matched tone: '{}' for app {:?}",
            t.name, detected_app
        );
        let _ = app.emit(
            "tone-applied",
            ToneAppliedEvent {
                tone_id: t.id.clone(),
                tone_name: t.name.clone(),
                detected_app: detected_app.clone(),
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
        return Some((
            rule.name.clone(),
            rule.prompt_template.clone(),
            tone,
            detected_app,
        ));
    }

    if tone.is_some() {
        let default_prompt = settings
            .modes
            .get(settings.active_mode_index)
            .map(|m| m.prompt.clone())
            .unwrap_or_default();
        return Some(("Tone".to_string(), default_prompt, tone, detected_app));
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
        Some((rule_name, prompt_template, tone, detected_app)) => {
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

            let style_section = get_style_section_for_command_mode(app, detected_app.as_deref());

            let full_prompt = format!(
                "You will receive an audio file. Your task:\n1. Transcribe the audio accurately\n2. Apply the following reformulation instructions to the transcription\n3. Return ONLY the final reformulated text, nothing else\n\n<reformulation_instructions>\n{}\n</reformulation_instructions>{}{}{}",
                clean_template,
                tone_section,
                style_section,
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
