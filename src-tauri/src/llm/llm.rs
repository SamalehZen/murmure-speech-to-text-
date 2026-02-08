use crate::context::BrowserContext;
use crate::dictionary;
use crate::llm::cloud_providers::{call_cloud_provider, LLMProviderType};
use crate::llm::helpers::{compose_prompt, load_llm_connect_settings, load_tones_settings, load_cloud_providers_settings, DEFAULT_BASE_PROMPT};
use crate::llm::tone_selector::select_tone;
use crate::llm::types::{
    OllamaGenerateRequest, OllamaGenerateResponse, OllamaModel, OllamaOptions, OllamaPullRequest,
    OllamaPullResponse, OllamaTagsResponse,
};
use log::{info, warn};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

pub async fn post_process_with_llm(
    app: &AppHandle,
    transcription: String,
    force_bypass: bool,
    browser_context: Option<BrowserContext>,
    window_title: Option<String>,
    app_name: Option<String>,
) -> Result<String, String> {
    if force_bypass {
        return Ok(transcription);
    }

    let llm_settings = load_llm_connect_settings(app);
    let tones_settings = load_tones_settings(app);
    let cloud_settings = load_cloud_providers_settings(app);

    let app_name_str = app_name.as_deref().unwrap_or("");

    let (prompt_template, model, provider) =
        match select_tone(&tones_settings, app_name_str, &browser_context) {
            Some(selection) => {
                info!(
                    "Selected tone '{}' matched by {:?}",
                    selection.tone.name, selection.matched_by
                );
                let _ = app.emit("tone-selected", &selection);
                let base = if tones_settings.base_prompt.trim().is_empty() {
                    DEFAULT_BASE_PROMPT
                } else {
                    &tones_settings.base_prompt
                };
                let composed = compose_prompt(&selection.tone, base);
                (composed, selection.tone.model, selection.tone.provider)
            }
            None => {
                let active_mode = llm_settings
                    .modes
                    .get(llm_settings.active_mode_index)
                    .ok_or("No active mode or tone available")?;
                (active_mode.prompt.clone(), active_mode.model.clone(), LLMProviderType::Ollama)
            }
        };

    if model.is_empty() {
        return Err("No model selected".to_string());
    }

    let _ = app.emit("llm-processing-start", ());

    let dictionary_words = dictionary::load(app)
        .unwrap_or_default()
        .into_keys()
        .collect::<Vec<String>>()
        .join(", ");

    let browser_url = browser_context
        .as_ref()
        .and_then(|c| c.url.as_deref())
        .unwrap_or("");
    let browser_domain = browser_context
        .as_ref()
        .and_then(|c| c.domain.as_deref())
        .unwrap_or("");
    let window_title_str = window_title.as_deref().unwrap_or("");

    let prompt = prompt_template
        .replace("{{TRANSCRIPT}}", &transcription)
        .replace("{transcript}", &transcription)
        .replace("{{DICTIONARY}}", &dictionary_words)
        .replace("{dictionary}", &dictionary_words)
        .replace("{{BROWSER_URL}}", browser_url)
        .replace("{browser_url}", browser_url)
        .replace("{{BROWSER_DOMAIN}}", browser_domain)
        .replace("{browser_domain}", browser_domain)
        .replace("{{WINDOW_TITLE}}", window_title_str)
        .replace("{window_title}", window_title_str)
        .replace("{{APP_NAME}}", app_name_str)
        .replace("{app_name}", app_name_str);

    let result = match provider {
        LLMProviderType::Ollama => {
            call_ollama(&llm_settings.url, &model, &prompt).await
        }
        LLMProviderType::Gemini => {
            let api_key = &cloud_settings.gemini.api_key;
            if api_key.is_empty() {
                Err("Gemini API key not configured".to_string())
            } else {
                call_cloud_provider(&provider, api_key, &model, &prompt).await
            }
        }
        LLMProviderType::OpenAI => {
            let api_key = &cloud_settings.openai.api_key;
            if api_key.is_empty() {
                Err("OpenAI API key not configured".to_string())
            } else {
                call_cloud_provider(&provider, api_key, &model, &prompt).await
            }
        }
        LLMProviderType::OpenRouter => {
            let api_key = &cloud_settings.openrouter.api_key;
            if api_key.is_empty() {
                Err("OpenRouter API key not configured".to_string())
            } else {
                call_cloud_provider(&provider, api_key, &model, &prompt).await
            }
        }
        LLMProviderType::Groq => {
            let api_key = &cloud_settings.groq.api_key;
            if api_key.is_empty() {
                Err("Groq API key not configured".to_string())
            } else {
                call_cloud_provider(&provider, api_key, &model, &prompt).await
            }
        }
    };

    let _ = app.emit("llm-processing-end", ());
    result
}

async fn call_ollama(url: &str, model: &str, prompt: &str) -> Result<String, String> {
    let client = reqwest::Client::new();
    let api_url = format!("{}/generate", url.trim_end_matches('/'));

    let request_body = OllamaGenerateRequest {
        model: model.to_string(),
        prompt: prompt.to_string(),
        stream: false,
        options: Some(OllamaOptions { temperature: 0.0 }),
    };

    let response = client
        .post(&api_url)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama API returned error: {}", response.status()));
    }

    let ollama_response: OllamaGenerateResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Ollama response: {}", e))?;

    Ok(ollama_response.response.trim().to_string())
}

pub async fn process_command_with_llm(app: &AppHandle, prompt: String) -> Result<String, String> {
    let llm_settings = load_llm_connect_settings(app);
    let tones_settings = load_tones_settings(app);
    let cloud_settings = load_cloud_providers_settings(app);

    let (model, provider) = if let Some(default_id) = &tones_settings.default_tone_id {
        tones_settings
            .tones
            .iter()
            .find(|t| &t.id == default_id)
            .filter(|t| !t.model.is_empty())
            .map(|t| (t.model.clone(), t.provider.clone()))
    } else {
        None
    }
    .or_else(|| {
        llm_settings
            .modes
            .get(llm_settings.active_mode_index)
            .filter(|m| !m.model.is_empty())
            .map(|m| (m.model.clone(), LLMProviderType::Ollama))
    })
    .ok_or("No model configured")?;

    let _ = app.emit("llm-processing-start", ());

    let result = match provider {
        LLMProviderType::Ollama => {
            call_ollama(&llm_settings.url, &model, &prompt).await
        }
        LLMProviderType::Gemini => {
            let api_key = &cloud_settings.gemini.api_key;
            if api_key.is_empty() {
                Err("Gemini API key not configured".to_string())
            } else {
                call_cloud_provider(&provider, api_key, &model, &prompt).await
            }
        }
        LLMProviderType::OpenAI => {
            let api_key = &cloud_settings.openai.api_key;
            if api_key.is_empty() {
                Err("OpenAI API key not configured".to_string())
            } else {
                call_cloud_provider(&provider, api_key, &model, &prompt).await
            }
        }
        LLMProviderType::OpenRouter => {
            let api_key = &cloud_settings.openrouter.api_key;
            if api_key.is_empty() {
                Err("OpenRouter API key not configured".to_string())
            } else {
                call_cloud_provider(&provider, api_key, &model, &prompt).await
            }
        }
        LLMProviderType::Groq => {
            let api_key = &cloud_settings.groq.api_key;
            if api_key.is_empty() {
                Err("Groq API key not configured".to_string())
            } else {
                call_cloud_provider(&provider, api_key, &model, &prompt).await
            }
        }
    };

    let _ = app.emit("llm-processing-end", ());
    result
}

pub async fn test_ollama_connection(url: String) -> Result<bool, String> {
    let client = reqwest::Client::new();
    let test_url = format!("{}/tags", url.trim_end_matches('/'));

    let response = client
        .get(&test_url)
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    if response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Server returned error: {}", response.status()))
    }
}

pub async fn fetch_ollama_models(url: String) -> Result<Vec<OllamaModel>, String> {
    let client = reqwest::Client::new();
    let tags_url = format!("{}/tags", url.trim_end_matches('/'));

    let response = client
        .get(&tags_url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch models: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Server returned error: {}", response.status()));
    }

    let tags_response: OllamaTagsResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(tags_response.models)
}

#[tauri::command]
pub async fn pull_ollama_model(app: AppHandle, url: String, model: String) -> Result<(), String> {
    let client = reqwest::Client::new();
    let pull_url = format!("{}/pull", url.trim_end_matches('/'));

    let request_body = OllamaPullRequest {
        model: model.clone(),
        stream: true,
    };

    let mut response = client
        .post(&pull_url)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama API returned error: {}", response.status()));
    }

    let mut buffer = String::new();
    while let Some(chunk) = response.chunk().await.map_err(|e| e.to_string())? {
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(pos) = buffer.find('\n') {
            let line: String = buffer.drain(..=pos).collect();
            if let Ok(pull_response) = serde_json::from_str::<OllamaPullResponse>(line.trim()) {
                let _ = app.emit("llm-pull-progress", pull_response);
            }
        }
    }

    Ok(())
}

/// Warm up the configured Ollama model by issuing a minimal generate request.
/// This reduces the perceived latency on the first real call during LLM Connect.
pub async fn warmup_ollama_model(app: &AppHandle) -> Result<(), String> {
    let llm_settings = load_llm_connect_settings(app);
    let tones_settings = load_tones_settings(app);

    if llm_settings.url.trim().is_empty() {
        return Ok(());
    }

    let model = if let Some(default_id) = &tones_settings.default_tone_id {
        tones_settings
            .tones
            .iter()
            .find(|t| &t.id == default_id)
            .map(|t| t.model.clone())
            .filter(|m| !m.is_empty())
    } else {
        None
    }
    .or_else(|| {
        if !llm_settings.modes.is_empty() {
            let active_mode = &llm_settings.modes[llm_settings.active_mode_index];
            if !active_mode.model.trim().is_empty() {
                Some(active_mode.model.clone())
            } else {
                None
            }
        } else {
            None
        }
    });

    let model = match model {
        Some(m) => m,
        None => return Ok(()),
    };

    let client = reqwest::Client::new();
    let url = format!("{}/generate", llm_settings.url.trim_end_matches('/'));

    let request_body = OllamaGenerateRequest {
        model,
        prompt: " ".to_string(),
        stream: false,
        options: Some(OllamaOptions { temperature: 0.0 }),
    };

    let response = client
        .post(&url)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama for warmup: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Ollama warmup returned error: {}",
            response.status()
        ));
    }

    Ok(())
}

/// Fire-and-forget background warmup used at the beginning of LLM recording.
pub fn warmup_ollama_model_background(app: &AppHandle) {
    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(e) = warmup_ollama_model(&app_handle).await {
            warn!("LLM warmup failed: {}", e);
        }
    });
}

pub fn switch_active_mode(app: &AppHandle, index: usize) {
    let mut llm_settings = load_llm_connect_settings(app);
    let mut tones_settings = load_tones_settings(app);

    if index < tones_settings.tones.len() {
        let tone = &tones_settings.tones[index];
        let previous_override = tones_settings.manual_override_tone_id.clone();
        let new_override = Some(tone.id.clone());

        if previous_override != new_override {
            tones_settings.manual_override_tone_id = new_override;
            let tone_name = tone.name.clone();

            if crate::llm::helpers::save_tones_settings(app, &tones_settings).is_ok() {
                let _ = app.emit("tones-settings-updated", &tones_settings);
                let _ = app.emit("overlay-feedback", &tone_name);
                crate::overlay::overlay::show_recording_overlay(app);
                let app_handle = app.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(Duration::from_millis(1000));
                    let current_settings = crate::settings::load_settings(&app_handle);
                    if current_settings.overlay_mode.as_str() == "always" {
                        return;
                    }
                    let is_recording = app_handle
                        .state::<crate::audio::types::AudioState>()
                        .recorder
                        .lock()
                        .is_some();
                    if !is_recording {
                        crate::overlay::overlay::hide_recording_overlay(&app_handle);
                    }
                });
                info!("Switched to tone: {}", tone_name);
            }
        }
    } else if index < llm_settings.modes.len() && llm_settings.active_mode_index != index {
        llm_settings.active_mode_index = index;
        let mode_name = llm_settings.modes[index].name.clone();

        if crate::llm::helpers::save_llm_connect_settings(app, &llm_settings).is_ok() {
            let _ = app.emit("llm-settings-updated", &llm_settings);
            let _ = app.emit("overlay-feedback", mode_name);
            crate::overlay::overlay::show_recording_overlay(app);
            let app_handle = app.clone();
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_millis(1000));
                let current_settings = crate::settings::load_settings(&app_handle);
                if current_settings.overlay_mode.as_str() == "always" {
                    return;
                }
                let is_recording = app_handle
                    .state::<crate::audio::types::AudioState>()
                    .recorder
                    .lock()
                    .is_some();
                if !is_recording {
                    crate::overlay::overlay::hide_recording_overlay(&app_handle);
                }
            });
        }
    }
}

pub fn clear_manual_override(app: &AppHandle) {
    let mut tones_settings = load_tones_settings(app);
    if tones_settings.manual_override_tone_id.is_some() {
        tones_settings.manual_override_tone_id = None;
        let _ = crate::llm::helpers::save_tones_settings(app, &tones_settings);
        let _ = app.emit("tones-settings-updated", &tones_settings);
    }
}
