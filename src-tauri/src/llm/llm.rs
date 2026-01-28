use crate::llm::helpers::load_llm_connect_settings;
use crate::llm::providers;
use crate::llm::types::{
    LLMProvider, OllamaGenerateRequest, OllamaModel, OllamaOptions, OllamaPullRequest,
    OllamaPullResponse, OllamaTagsResponse, ProviderConfig,
};
use log::warn;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

fn get_provider_key(provider: &LLMProvider) -> String {
    match provider {
        LLMProvider::Ollama => "ollama".to_string(),
        LLMProvider::OpenAI => "openai".to_string(),
        LLMProvider::Anthropic => "anthropic".to_string(),
        LLMProvider::Google => "google".to_string(),
        LLMProvider::OpenRouter => "openrouter".to_string(),
    }
}

async fn generate_with_provider(
    config: &ProviderConfig,
    prompt: &str,
    temperature: f32,
) -> Result<String, String> {
    match config.provider {
        LLMProvider::Ollama => providers::ollama::generate(config, prompt, temperature).await,
        LLMProvider::OpenAI => providers::openai::generate(config, prompt, temperature).await,
        LLMProvider::Anthropic => providers::anthropic::generate(config, prompt, temperature).await,
        LLMProvider::Google => providers::google::generate(config, prompt, temperature).await,
        LLMProvider::OpenRouter => providers::openrouter::generate(config, prompt, temperature).await,
    }
}

pub async fn process_command_with_llm(app: &AppHandle, prompt: String) -> Result<String, String> {
    let settings = load_llm_connect_settings(app);
    let provider_key = get_provider_key(&settings.active_provider);

    let provider_config = if settings.active_provider == LLMProvider::Ollama {
        ProviderConfig {
            provider: LLMProvider::Ollama,
            api_key: None,
            base_url: settings.url.clone(),
            model: settings
                .modes
                .get(settings.active_mode_index)
                .map(|m| m.model.clone())
                .unwrap_or_default(),
            available_models: Vec::new(),
        }
    } else {
        settings
            .providers
            .get(&provider_key)
            .cloned()
            .ok_or("Provider not configured")?
    };

    if provider_config.model.is_empty() {
        return Err("No model selected".to_string());
    }

    let _ = app.emit("llm-processing-start", ());

    let result = generate_with_provider(&provider_config, &prompt, 0.0).await;

    let _ = app.emit("llm-processing-end", ());

    match result {
        Ok(response) => Ok(response),
        Err(e) => {
            warn!("LLM command processing failed: {}", e);
            Err(e)
        }
    }
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

pub async fn warmup_ollama_model(app: &AppHandle) -> Result<(), String> {
    let settings = load_llm_connect_settings(app);

    if settings.modes.is_empty() || settings.url.trim().is_empty() {
        return Ok(());
    }
    let active_mode = &settings.modes[settings.active_mode_index];
    if active_mode.model.trim().is_empty() {
        return Ok(());
    }

    let client = reqwest::Client::new();
    let url = format!("{}/generate", settings.url.trim_end_matches('/'));

    let request_body = OllamaGenerateRequest {
        model: active_mode.model.clone(),
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

pub fn warmup_ollama_model_background(app: &AppHandle) {
    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(e) = warmup_ollama_model(&app_handle).await {
            warn!("LLM warmup failed: {}", e);
        }
    });
}

pub fn switch_active_mode(app: &AppHandle, index: usize) {
    let mut settings = load_llm_connect_settings(app);

    if index < settings.modes.len() && settings.active_mode_index != index {
        settings.active_mode_index = index;
        let mode_name = settings.modes[index].name.clone();

        if crate::llm::helpers::save_llm_connect_settings(app, &settings).is_ok() {
            let _ = app.emit("llm-settings-updated", &settings);
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

pub async fn fetch_provider_models(
    provider: LLMProvider,
    api_key: String,
    base_url: Option<String>,
) -> Result<Vec<String>, String> {
    let config = ProviderConfig {
        provider: provider.clone(),
        api_key: Some(api_key),
        base_url: base_url.unwrap_or_else(|| match provider {
            LLMProvider::Ollama => "http://localhost:11434/api".to_string(),
            LLMProvider::OpenAI => "https://api.openai.com/v1".to_string(),
            LLMProvider::Anthropic => "https://api.anthropic.com/v1".to_string(),
            LLMProvider::Google => "https://generativelanguage.googleapis.com/v1beta".to_string(),
            LLMProvider::OpenRouter => "https://openrouter.ai/api/v1".to_string(),
        }),
        model: String::new(),
        available_models: Vec::new(),
    };

    match provider {
        LLMProvider::Ollama => providers::ollama::list_models(&config).await,
        LLMProvider::OpenAI => providers::openai::list_models(&config).await,
        LLMProvider::Anthropic => providers::anthropic::list_models(&config).await,
        LLMProvider::Google => providers::google::list_models(&config).await,
        LLMProvider::OpenRouter => providers::openrouter::list_models(&config).await,
    }
}

pub async fn test_provider_connection(
    provider: LLMProvider,
    api_key: String,
    base_url: Option<String>,
) -> Result<bool, String> {
    let config = ProviderConfig {
        provider: provider.clone(),
        api_key: Some(api_key),
        base_url: base_url.unwrap_or_else(|| match provider {
            LLMProvider::Ollama => "http://localhost:11434/api".to_string(),
            LLMProvider::OpenAI => "https://api.openai.com/v1".to_string(),
            LLMProvider::Anthropic => "https://api.anthropic.com/v1".to_string(),
            LLMProvider::Google => "https://generativelanguage.googleapis.com/v1beta".to_string(),
            LLMProvider::OpenRouter => "https://openrouter.ai/api/v1".to_string(),
        }),
        model: String::new(),
        available_models: Vec::new(),
    };

    match provider {
        LLMProvider::Ollama => providers::ollama::test_connection(&config).await,
        LLMProvider::OpenAI => providers::openai::test_connection(&config).await,
        LLMProvider::Anthropic => providers::anthropic::test_connection(&config).await,
        LLMProvider::Google => providers::google::test_connection(&config).await,
        LLMProvider::OpenRouter => providers::openrouter::test_connection(&config).await,
    }
}
