use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToneConfig {
    pub id: String,
    pub name: String,
    pub description: String,
    pub prompt_modifier: String,
    pub icon: String,
    pub apps: Vec<String>,
}

impl ToneConfig {
    pub fn default_tones() -> Vec<ToneConfig> {
        vec![
            ToneConfig {
                id: "professional".to_string(),
                name: "Professionnel".to_string(),
                description: "Emails et communications d'entreprise".to_string(),
                icon: "📧".to_string(),
                prompt_modifier: r#"Reformule de manière professionnelle et formelle:
- Ajoute une salutation appropriée (Bonjour/Madame/Monsieur)
- Utilise le vouvoiement
- Structure en paragraphes clairs
- Ajoute une formule de politesse (Cordialement, Bien à vous)
- Corrige grammaire et orthographe"#.to_string(),
                apps: vec![
                    "Microsoft Outlook".to_string(),
                    "Gmail".to_string(),
                    "Microsoft Word".to_string(),
                    "Mozilla Thunderbird".to_string(),
                ],
            },
            ToneConfig {
                id: "semiformal".to_string(),
                name: "Semi-formel".to_string(),
                description: "Communications de travail décontractées".to_string(),
                icon: "💬".to_string(),
                prompt_modifier: r#"Reformule de manière semi-formelle:
- Garde un ton professionnel mais accessible
- Tutoiement ou vouvoiement selon le contexte
- Corrige les erreurs sans être trop rigide
- Style concis et direct"#.to_string(),
                apps: vec![
                    "Slack".to_string(),
                    "Microsoft Teams".to_string(),
                    "Discord".to_string(),
                ],
            },
            ToneConfig {
                id: "casual".to_string(),
                name: "Casual".to_string(),
                description: "Messages entre amis et famille".to_string(),
                icon: "😎".to_string(),
                prompt_modifier: r#"Reformule de manière décontractée:
- Ton amical et naturel
- Tutoiement
- Utilise des emojis occasionnellement si approprié
- Garde les abréviations courantes
- Corrige juste les erreurs évidentes"#.to_string(),
                apps: vec![
                    "WhatsApp".to_string(),
                    "Messenger".to_string(),
                    "Telegram".to_string(),
                    "Signal".to_string(),
                ],
            },
            ToneConfig {
                id: "technical".to_string(),
                name: "Technique".to_string(),
                description: "Code et documentation".to_string(),
                icon: "💻".to_string(),
                prompt_modifier: r#"Format technique pour IDE/code:
- Si c'est une demande de code, génère le code approprié
- Si c'est un commentaire, formate-le correctement (// ou /* */)
- Préserve les termes techniques en anglais
- Respecte la casse: camelCase, PascalCase, snake_case
- Pas de markdown ni backticks"#.to_string(),
                apps: vec![
                    "Visual Studio Code".to_string(),
                    "IntelliJ IDEA".to_string(),
                    "PyCharm".to_string(),
                    "WebStorm".to_string(),
                    "Sublime Text".to_string(),
                    "Notepad++".to_string(),
                ],
            },
            ToneConfig {
                id: "notes".to_string(),
                name: "Notes".to_string(),
                description: "Prise de notes et documentation".to_string(),
                icon: "📝".to_string(),
                prompt_modifier: r#"Format pour prise de notes:
- Structure avec bullet points si approprié
- Identifie les points clés
- Style concis et organisé
- Peut utiliser du markdown basique"#.to_string(),
                apps: vec![
                    "Notion".to_string(),
                    "Obsidian".to_string(),
                    "Evernote".to_string(),
                    "Microsoft OneNote".to_string(),
                ],
            },
            ToneConfig {
                id: "creative".to_string(),
                name: "Créatif".to_string(),
                description: "Écriture créative et storytelling".to_string(),
                icon: "✨".to_string(),
                prompt_modifier: r#"Style créatif et expressif:
- Enrichis le vocabulaire
- Garde le ton personnel de l'auteur
- Améliore la fluidité sans changer le sens
- Ponctuation expressive autorisée"#.to_string(),
                apps: vec![],
            },
        ]
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum LLMProvider {
    Ollama,
    OpenAI,
    Anthropic,
    Google,
    OpenRouter,
}

impl Default for LLMProvider {
    fn default() -> Self {
        LLMProvider::Ollama
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub provider: LLMProvider,
    pub api_key: Option<String>,
    pub base_url: String,
    pub model: String,
    pub available_models: Vec<String>,
}

impl Default for ProviderConfig {
    fn default() -> Self {
        Self {
            provider: LLMProvider::Ollama,
            api_key: None,
            base_url: "http://localhost:11434/api".to_string(),
            model: String::new(),
            available_models: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AppMatchType {
    AppNameContains,
    WindowTitleContains,
    ProcessNameEquals,
    WindowTitleRegex,
    #[serde(alias = "browser_url_contains")]
    BrowserUrlContains,
    #[serde(alias = "process_path_contains")]
    ProcessPathContains,
    #[serde(alias = "window_class_equals")]
    WindowClassEquals,
    #[serde(alias = "detected_app_equals")]
    DetectedAppEquals,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppPromptRule {
    pub id: String,
    pub name: String,
    pub match_type: AppMatchType,
    pub match_pattern: String,
    pub prompt_template: String,
    pub priority: i32,
    pub enabled: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(default)]
pub struct LLMConnectSettings {
    pub url: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub model: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub prompt: String,
    pub modes: Vec<LLMMode>,
    pub active_mode_index: usize,
    pub onboarding_completed: bool,
    #[serde(default)]
    pub active_provider: LLMProvider,
    #[serde(default)]
    pub providers: HashMap<String, ProviderConfig>,
    #[serde(default)]
    pub app_detection_enabled: bool,
    #[serde(default)]
    pub app_rules: Vec<AppPromptRule>,
    #[serde(default)]
    pub tones: Vec<ToneConfig>,
    #[serde(default)]
    pub app_tone_overrides: HashMap<String, String>,
    #[serde(default)]
    pub default_tone_id: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LLMMode {
    pub name: String,
    pub prompt: String,
    pub model: String,
    pub shortcut: String,
}

impl Default for LLMConnectSettings {
    fn default() -> Self {
        let mut providers = HashMap::new();
        providers.insert(
            "ollama".to_string(),
            ProviderConfig {
                provider: LLMProvider::Ollama,
                api_key: None,
                base_url: "http://localhost:11434/api".to_string(),
                model: String::new(),
                available_models: Vec::new(),
            },
        );
        providers.insert(
            "openai".to_string(),
            ProviderConfig {
                provider: LLMProvider::OpenAI,
                api_key: None,
                base_url: "https://api.openai.com/v1".to_string(),
                model: "gpt-4o-mini".to_string(),
                available_models: Vec::new(),
            },
        );
        providers.insert(
            "anthropic".to_string(),
            ProviderConfig {
                provider: LLMProvider::Anthropic,
                api_key: None,
                base_url: "https://api.anthropic.com/v1".to_string(),
                model: "claude-3-5-sonnet-latest".to_string(),
                available_models: vec![
                    "claude-3-5-sonnet-latest".to_string(),
                    "claude-3-5-haiku-latest".to_string(),
                    "claude-3-opus-latest".to_string(),
                ],
            },
        );
        providers.insert(
            "google".to_string(),
            ProviderConfig {
                provider: LLMProvider::Google,
                api_key: None,
                base_url: "https://generativelanguage.googleapis.com/v1beta".to_string(),
                model: "gemini-2.5-flash".to_string(),
                available_models: Vec::new(),
            },
        );
        providers.insert(
            "openrouter".to_string(),
            ProviderConfig {
                provider: LLMProvider::OpenRouter,
                api_key: None,
                base_url: "https://openrouter.ai/api/v1".to_string(),
                model: String::new(),
                available_models: Vec::new(),
            },
        );

        Self {
            url: "http://localhost:11434/api".to_string(),
            model: String::new(),
            prompt: String::new(),
            modes: Vec::new(),
            active_mode_index: 0,
            onboarding_completed: false,
            active_provider: LLMProvider::Ollama,
            providers,
            app_detection_enabled: false,
            app_rules: Vec::new(),
            tones: ToneConfig::default_tones(),
            app_tone_overrides: HashMap::new(),
            default_tone_id: None,
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OllamaGenerateRequest {
    pub model: String,
    pub prompt: String,
    pub stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<OllamaOptions>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OllamaOptions {
    pub temperature: f32,
}

#[derive(Serialize, Deserialize, Debug)]
#[allow(dead_code)]
pub struct OllamaGenerateResponse {
    pub response: String,
    pub done: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OllamaTagsResponse {
    pub models: Vec<OllamaModel>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OllamaModel {
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OllamaPullRequest {
    pub model: String,
    pub stream: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct OllamaPullResponse {
    pub status: String,
    pub digest: Option<String>,
    pub total: Option<u64>,
    pub completed: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenAIMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct OpenAIChatRequest {
    pub model: String,
    pub messages: Vec<OpenAIMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct OpenAIChatResponse {
    pub choices: Vec<OpenAIChoice>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct OpenAIChoice {
    pub message: OpenAIMessage,
}

#[derive(Debug, Deserialize)]
pub struct OpenAIModelsResponse {
    pub data: Vec<OpenAIModelInfo>,
}

#[derive(Debug, Deserialize)]
pub struct OpenAIModelInfo {
    pub id: String,
}

#[derive(Debug, Serialize)]
pub struct AnthropicRequest {
    pub model: String,
    pub max_tokens: u32,
    pub messages: Vec<OpenAIMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct AnthropicResponse {
    pub content: Vec<AnthropicContent>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct AnthropicContent {
    pub text: String,
}

#[derive(Debug, Serialize)]
#[allow(dead_code)]
pub struct GoogleGenerateRequest {
    pub contents: Vec<GoogleContent>,
    #[serde(rename = "generationConfig", skip_serializing_if = "Option::is_none")]
    pub generation_config: Option<GoogleGenerationConfig>,
}

#[derive(Debug, Serialize)]
#[allow(dead_code)]
pub struct GoogleContent {
    pub parts: Vec<GooglePart>,
}

#[derive(Debug, Serialize)]
#[allow(dead_code)]
pub struct GooglePart {
    pub text: String,
}

#[derive(Debug, Serialize)]
pub struct GoogleGenerationConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(rename = "maxOutputTokens", skip_serializing_if = "Option::is_none")]
    pub max_output_tokens: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct GoogleGenerateResponse {
    pub candidates: Option<Vec<GoogleCandidate>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GoogleCandidate {
    pub content: GoogleResponseContent,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GoogleResponseContent {
    pub parts: Vec<GoogleResponsePart>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GoogleResponsePart {
    pub text: String,
}

#[derive(Debug, Deserialize)]
pub struct GoogleModelsResponse {
    pub models: Vec<GoogleModelInfo>,
}

#[derive(Debug, Deserialize)]
pub struct GoogleModelInfo {
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct GoogleInlineData {
    pub mime_type: String,
    pub data: String,
}

#[derive(Debug, Serialize)]
pub struct GoogleMultimodalPart {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inline_data: Option<GoogleInlineData>,
}

#[derive(Debug, Serialize)]
pub struct GoogleMultimodalContent {
    pub parts: Vec<GoogleMultimodalPart>,
}

#[derive(Debug, Serialize)]
pub struct GoogleMultimodalRequest {
    pub contents: Vec<GoogleMultimodalContent>,
    #[serde(rename = "generationConfig", skip_serializing_if = "Option::is_none")]
    pub generation_config: Option<GoogleGenerationConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppContextEvent {
    pub app_name: String,
    pub rule_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToneAppliedEvent {
    pub tone_id: String,
    pub tone_name: String,
    pub detected_app: Option<String>,
}
