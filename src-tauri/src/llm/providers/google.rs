use crate::llm::types::{
    GoogleContent, GoogleGenerateRequest, GoogleGenerateResponse, GoogleGenerationConfig,
    GoogleInlineData, GoogleModelsResponse, GoogleMultimodalContent, GoogleMultimodalPart,
    GoogleMultimodalRequest, GooglePart, ProviderConfig,
};
use base64::{engine::general_purpose::STANDARD, Engine};

#[allow(dead_code)]
pub async fn generate(config: &ProviderConfig, prompt: &str, temperature: f32) -> Result<String, String> {
    let api_key = config.api_key.as_ref().ok_or("API key not configured")?;
    let client = reqwest::Client::new();
    let url = format!(
        "{}/models/{}:generateContent?key={}",
        config.base_url.trim_end_matches('/'),
        config.model,
        api_key
    );

    let request_body = GoogleGenerateRequest {
        contents: vec![GoogleContent {
            parts: vec![GooglePart {
                text: prompt.to_string(),
            }],
        }],
        generation_config: Some(GoogleGenerationConfig {
            temperature: Some(temperature),
            max_output_tokens: Some(8192),
        }),
    };

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Google AI: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Google AI API returned error {}: {}", status, error_text));
    }

    let google_response: GoogleGenerateResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Google AI response: {}", e))?;

    google_response
        .candidates
        .and_then(|c| c.first().cloned())
        .and_then(|c| c.content.parts.first().cloned())
        .map(|p| p.text.trim().to_string())
        .ok_or_else(|| "No response from Google AI".to_string())
}

pub async fn list_models(config: &ProviderConfig) -> Result<Vec<String>, String> {
    let api_key = config.api_key.as_ref().ok_or("API key not configured")?;
    let client = reqwest::Client::new();
    let url = format!(
        "{}/models?key={}",
        config.base_url.trim_end_matches('/'),
        api_key
    );

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch models: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Server returned error: {}", response.status()));
    }

    let models_response: GoogleModelsResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let models: Vec<String> = models_response
        .models
        .into_iter()
        .filter(|m| m.name.contains("gemini"))
        .map(|m| m.name.replace("models/", ""))
        .collect();

    Ok(models)
}

pub async fn test_connection(config: &ProviderConfig) -> Result<bool, String> {
    let api_key = config.api_key.as_ref().ok_or("API key not configured")?;
    let client = reqwest::Client::new();
    let url = format!(
        "{}/models?key={}",
        config.base_url.trim_end_matches('/'),
        api_key
    );

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    if response.status().is_success() {
        Ok(true)
    } else if response.status().as_u16() == 400 || response.status().as_u16() == 403 {
        Err("Invalid API key".to_string())
    } else {
        Err(format!("Server returned error: {}", response.status()))
    }
}

const DEFAULT_TRANSCRIPTION_PROMPT: &str = "Transcribe this audio accurately. Return only the transcribed text, nothing else.";

pub async fn transcribe_audio(
    config: &ProviderConfig,
    audio_data: Vec<u8>,
    system_prompt: Option<String>,
) -> Result<String, String> {
    let api_key = config
        .api_key
        .as_ref()
        .ok_or("Google API key not configured. Go to Settings > LLM Connect to configure.")?;
    
    let client = reqwest::Client::new();
    let url = format!(
        "{}/models/{}:generateContent?key={}",
        config.base_url.trim_end_matches('/'),
        config.model,
        api_key
    );

    let audio_base64 = STANDARD.encode(&audio_data);

    let text_prompt = match system_prompt {
        Some(prompt) => format!(
            "{}\n\nTranscribe this audio accurately according to the formatting instructions above. Return only the transcribed and formatted text, nothing else.",
            prompt
        ),
        None => DEFAULT_TRANSCRIPTION_PROMPT.to_string(),
    };

    let request_body = GoogleMultimodalRequest {
        contents: vec![GoogleMultimodalContent {
            parts: vec![
                GoogleMultimodalPart {
                    inline_data: Some(GoogleInlineData {
                        mime_type: "audio/wav".to_string(),
                        data: audio_base64,
                    }),
                    text: None,
                },
                GoogleMultimodalPart {
                    text: Some(text_prompt),
                    inline_data: None,
                },
            ],
        }],
        generation_config: Some(GoogleGenerationConfig {
            temperature: Some(0.0),
            max_output_tokens: Some(8192),
        }),
    };

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Google AI: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!(
            "Google AI API returned error {}: {}",
            status, error_text
        ));
    }

    let google_response: GoogleGenerateResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Google AI response: {}", e))?;

    google_response
        .candidates
        .and_then(|c| c.first().cloned())
        .and_then(|c| c.content.parts.first().cloned())
        .map(|p| p.text.trim().to_string())
        .ok_or_else(|| "No response from Google AI".to_string())
}
