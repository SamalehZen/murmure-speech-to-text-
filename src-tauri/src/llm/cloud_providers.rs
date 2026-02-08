use serde::{Deserialize, Serialize};
use log::{info, error};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Default)]
#[serde(rename_all = "lowercase")]
pub enum LLMProviderType {
    #[default]
    Ollama,
    Gemini,
    OpenAI,
    OpenRouter,
    Groq,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct CloudProviderConfig {
    pub provider: LLMProviderType,
    pub api_key: String,
    pub model: String,
    #[serde(default)]
    pub endpoint: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(default)]
pub struct CloudProvidersSettings {
    pub gemini: ProviderSettings,
    pub openai: ProviderSettings,
    pub openrouter: ProviderSettings,
    pub groq: ProviderSettings,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(default)]
pub struct ProviderSettings {
    pub api_key: String,
    pub default_model: String,
    #[serde(default)]
    pub custom_endpoint: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CloudModel {
    pub id: String,
    pub name: String,
    pub provider: LLMProviderType,
}

pub fn get_gemini_models() -> Vec<CloudModel> {
    vec![
        CloudModel {
            id: "gemini-2.5-flash".to_string(),
            name: "Gemini 2.5 Flash".to_string(),
            provider: LLMProviderType::Gemini,
        },
        CloudModel {
            id: "gemini-2.5-flash-lite".to_string(),
            name: "Gemini 2.5 Flash Lite".to_string(),
            provider: LLMProviderType::Gemini,
        },
        CloudModel {
            id: "gemini-2.0-flash".to_string(),
            name: "Gemini 2.0 Flash".to_string(),
            provider: LLMProviderType::Gemini,
        },
        CloudModel {
            id: "gemini-2.0-flash-lite".to_string(),
            name: "Gemini 2.0 Flash Lite".to_string(),
            provider: LLMProviderType::Gemini,
        },
        CloudModel {
            id: "gemini-1.5-flash".to_string(),
            name: "Gemini 1.5 Flash".to_string(),
            provider: LLMProviderType::Gemini,
        },
        CloudModel {
            id: "gemini-1.5-pro".to_string(),
            name: "Gemini 1.5 Pro".to_string(),
            provider: LLMProviderType::Gemini,
        },
    ]
}

pub fn get_openai_models() -> Vec<CloudModel> {
    vec![
        CloudModel {
            id: "gpt-4o".to_string(),
            name: "GPT-4o".to_string(),
            provider: LLMProviderType::OpenAI,
        },
        CloudModel {
            id: "gpt-4o-mini".to_string(),
            name: "GPT-4o Mini".to_string(),
            provider: LLMProviderType::OpenAI,
        },
        CloudModel {
            id: "gpt-4-turbo".to_string(),
            name: "GPT-4 Turbo".to_string(),
            provider: LLMProviderType::OpenAI,
        },
        CloudModel {
            id: "gpt-3.5-turbo".to_string(),
            name: "GPT-3.5 Turbo".to_string(),
            provider: LLMProviderType::OpenAI,
        },
    ]
}

pub fn get_groq_models() -> Vec<CloudModel> {
    vec![
        CloudModel {
            id: "llama-3.3-70b-versatile".to_string(),
            name: "Llama 3.3 70B".to_string(),
            provider: LLMProviderType::Groq,
        },
        CloudModel {
            id: "llama-3.1-8b-instant".to_string(),
            name: "Llama 3.1 8B Instant".to_string(),
            provider: LLMProviderType::Groq,
        },
        CloudModel {
            id: "mixtral-8x7b-32768".to_string(),
            name: "Mixtral 8x7B".to_string(),
            provider: LLMProviderType::Groq,
        },
        CloudModel {
            id: "gemma2-9b-it".to_string(),
            name: "Gemma 2 9B".to_string(),
            provider: LLMProviderType::Groq,
        },
    ]
}

pub fn get_openrouter_models() -> Vec<CloudModel> {
    vec![
        CloudModel {
            id: "openai/gpt-4o".to_string(),
            name: "OpenAI GPT-4o".to_string(),
            provider: LLMProviderType::OpenRouter,
        },
        CloudModel {
            id: "openai/gpt-4o-mini".to_string(),
            name: "OpenAI GPT-4o Mini".to_string(),
            provider: LLMProviderType::OpenRouter,
        },
        CloudModel {
            id: "anthropic/claude-3.5-sonnet".to_string(),
            name: "Claude 3.5 Sonnet".to_string(),
            provider: LLMProviderType::OpenRouter,
        },
        CloudModel {
            id: "google/gemini-2.0-flash-001".to_string(),
            name: "Gemini 2.0 Flash".to_string(),
            provider: LLMProviderType::OpenRouter,
        },
        CloudModel {
            id: "meta-llama/llama-3.3-70b-instruct".to_string(),
            name: "Llama 3.3 70B".to_string(),
            provider: LLMProviderType::OpenRouter,
        },
    ]
}

#[derive(Serialize, Deserialize, Debug)]
struct GeminiRequest {
    contents: Vec<GeminiContent>,
    #[serde(rename = "generationConfig")]
    generation_config: GeminiGenerationConfig,
}

#[derive(Serialize, Deserialize, Debug)]
struct GeminiContent {
    parts: Vec<GeminiPart>,
}

#[derive(Serialize, Deserialize, Debug)]
struct GeminiPart {
    text: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct GeminiGenerationConfig {
    temperature: f32,
}

#[derive(Serialize, Deserialize, Debug)]
struct GeminiResponse {
    candidates: Vec<GeminiCandidate>,
}

#[derive(Serialize, Deserialize, Debug)]
struct GeminiCandidate {
    content: GeminiContent,
}

#[derive(Serialize, Deserialize, Debug)]
struct OpenAIRequest {
    model: String,
    messages: Vec<OpenAIMessage>,
    temperature: f32,
}

#[derive(Serialize, Deserialize, Debug)]
struct OpenAIMessage {
    role: String,
    content: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct OpenAIResponse {
    choices: Vec<OpenAIChoice>,
}

#[derive(Serialize, Deserialize, Debug)]
struct OpenAIChoice {
    message: OpenAIMessage,
}

pub async fn call_gemini(api_key: &str, model: &str, prompt: &str) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        model, api_key
    );

    let request_body = GeminiRequest {
        contents: vec![GeminiContent {
            parts: vec![GeminiPart {
                text: prompt.to_string(),
            }],
        }],
        generation_config: GeminiGenerationConfig { temperature: 0.0 },
    };

    let response = client
        .post(&url)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Gemini: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        error!("Gemini API error: {} - {}", status, body);
        return Err(format!("Gemini API error: {}", status));
    }

    let gemini_response: GeminiResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Gemini response: {}", e))?;

    gemini_response
        .candidates
        .first()
        .and_then(|c| c.content.parts.first())
        .map(|p| p.text.trim().to_string())
        .ok_or_else(|| "Empty response from Gemini".to_string())
}

pub async fn call_openai(api_key: &str, model: &str, prompt: &str, endpoint: Option<&str>) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = endpoint.unwrap_or("https://api.openai.com/v1/chat/completions");

    let request_body = OpenAIRequest {
        model: model.to_string(),
        messages: vec![OpenAIMessage {
            role: "user".to_string(),
            content: prompt.to_string(),
        }],
        temperature: 0.0,
    };

    let response = client
        .post(url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to OpenAI: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        error!("OpenAI API error: {} - {}", status, body);
        return Err(format!("OpenAI API error: {}", status));
    }

    let openai_response: OpenAIResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse OpenAI response: {}", e))?;

    openai_response
        .choices
        .first()
        .map(|c| c.message.content.trim().to_string())
        .ok_or_else(|| "Empty response from OpenAI".to_string())
}

pub async fn call_openrouter(api_key: &str, model: &str, prompt: &str) -> Result<String, String> {
    call_openai(api_key, model, prompt, Some("https://openrouter.ai/api/v1/chat/completions")).await
}

pub async fn call_groq(api_key: &str, model: &str, prompt: &str) -> Result<String, String> {
    call_openai(api_key, model, prompt, Some("https://api.groq.com/openai/v1/chat/completions")).await
}

pub async fn test_cloud_provider(provider: &LLMProviderType, api_key: &str) -> Result<bool, String> {
    let test_prompt = "Say 'OK' if you can read this.";
    let test_model = match provider {
        LLMProviderType::Gemini => "gemini-2.5-flash-lite",
        LLMProviderType::OpenAI => "gpt-4o-mini",
        LLMProviderType::OpenRouter => "openai/gpt-4o-mini",
        LLMProviderType::Groq => "llama-3.1-8b-instant",
        LLMProviderType::Ollama => return Ok(true),
    };

    let result = match provider {
        LLMProviderType::Gemini => call_gemini(api_key, test_model, test_prompt).await,
        LLMProviderType::OpenAI => call_openai(api_key, test_model, test_prompt, None).await,
        LLMProviderType::OpenRouter => call_openrouter(api_key, test_model, test_prompt).await,
        LLMProviderType::Groq => call_groq(api_key, test_model, test_prompt).await,
        LLMProviderType::Ollama => return Ok(true),
    };

    match result {
        Ok(_) => {
            info!("Cloud provider {:?} test successful", provider);
            Ok(true)
        }
        Err(e) => {
            error!("Cloud provider {:?} test failed: {}", provider, e);
            Err(e)
        }
    }
}

pub async fn call_cloud_provider(
    provider: &LLMProviderType,
    api_key: &str,
    model: &str,
    prompt: &str,
) -> Result<String, String> {
    match provider {
        LLMProviderType::Gemini => call_gemini(api_key, model, prompt).await,
        LLMProviderType::OpenAI => call_openai(api_key, model, prompt, None).await,
        LLMProviderType::OpenRouter => call_openrouter(api_key, model, prompt).await,
        LLMProviderType::Groq => call_groq(api_key, model, prompt).await,
        LLMProviderType::Ollama => Err("Use Ollama API directly".to_string()),
    }
}
