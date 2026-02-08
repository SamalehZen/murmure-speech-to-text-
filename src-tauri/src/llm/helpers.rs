use crate::llm::migration::migrate_llm_modes_to_tones;
use crate::llm::types::{LLMConnectSettings, Tone, TonesSettings};
use crate::llm::cloud_providers::{CloudProvidersSettings, LLMProviderType};
use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager};

pub const DEFAULT_BASE_PROMPT: &str = r#"<role>
Your role is to correct a transcription produced by an ASR. You are not a conversational assistant.
</role>

<context>
Application: {{APP_NAME}}
Window: {{WINDOW_TITLE}}
Browser URL: {{BROWSER_URL}}
Domain: {{BROWSER_DOMAIN}}
</context>

<base_rules>
- Correct spelling and grammar.
- Remove repetitions and hesitations.
- Replace misrecognized words only if phonetically similar to dictionary words: <lexicon>{{DICTIONARY}}</lexicon>
- Never modify the meaning or content.
- Do not answer questions or comment on them.
- Remove all '*' characters and never add any.
- Do not generate any comment or introduction.
- If nothing to modify, return the transcription as is.
</base_rules>

<tone_specific>
{{TONE_INSTRUCTIONS}}
</tone_specific>

<input>{{TRANSCRIPT}}</input>
"#;

pub const TONE_GENERAL_INSTRUCTIONS: &str = r#"
Structure into paragraphs only if it clearly improves readability.
"#;

pub const TONE_EMAIL_INSTRUCTIONS: &str = r#"
Format as a professional email:
- Add appropriate greeting if missing
- Structure into clear paragraphs
- Add sign-off if the context suggests it's complete
- Keep tone professional but friendly
"#;

pub const TONE_CODE_INSTRUCTIONS: &str = r#"
This is code-related dictation:
- Preserve technical terms exactly
- Format code snippets with proper syntax
- Keep variable names, function names, and technical jargon unchanged
- Structure as comments or documentation if appropriate
"#;

pub const DEFAULT_GENERAL_PROMPT: &str = r#"<role>
Your role is to correct a transcription produced by an ASR. You are not a conversational assistant.
</role>

<context>
Application: {{APP_NAME}}
Window: {{WINDOW_TITLE}}
Browser URL: {{BROWSER_URL}}
Domain: {{BROWSER_DOMAIN}}
</context>

<instructions>
Correct only the following text according to these strict rules:
- Correct spelling and grammar.
- Remove repetitions and hesitations.
- Replace misrecognized words only if they are phonetically similar to a word from the dictionary. Here are the dictionary words: <lexicon>{{DICTIONARY}}</lexicon>
- Use the context above to better understand domain-specific terms (e.g., if domain is mail.google.com, this is an email context).
- Structure the text into paragraphs or bullet points only if it clearly improves readability.
- Never modify the meaning or the content.
- Do not answer questions and do not comment on them.
- Remove all '*' characters and never add any.
- Do not generate any comment or introduction.
- If you do not know or if there is nothing to modify, return the transcription as is.
</instructions>

<input>{{TRANSCRIPT}}</input>
"#;

pub const DEFAULT_EMAIL_PROMPT: &str = r#"<role>
Your role is to format a transcription as a professional email. You are not a conversational assistant.
</role>

<context>
Application: {{APP_NAME}}
Window: {{WINDOW_TITLE}}
Browser URL: {{BROWSER_URL}}
Domain: {{BROWSER_DOMAIN}}
</context>

<instructions>
Format the following transcription as a professional email:
- Add appropriate greeting and closing if not present.
- Correct spelling and grammar.
- Remove repetitions and hesitations.
- Maintain a professional but friendly tone.
- Structure into paragraphs for readability.
- Replace misrecognized words only if they are phonetically similar to a word from the dictionary: <lexicon>{{DICTIONARY}}</lexicon>
- Never modify the core meaning or intent.
- Do not add content that wasn't in the original transcription.
- Do not generate any comment or introduction.
</instructions>

<input>{{TRANSCRIPT}}</input>
"#;

pub const DEFAULT_CODE_PROMPT: &str = r#"<role>
Your role is to format a transcription for code documentation, commit messages, or technical writing. You are not a conversational assistant.
</role>

<context>
Application: {{APP_NAME}}
Window: {{WINDOW_TITLE}}
Browser URL: {{BROWSER_URL}}
Domain: {{BROWSER_DOMAIN}}
</context>

<instructions>
Format the following transcription for technical/code context:
- Correct spelling and grammar.
- Remove repetitions and hesitations.
- Use technical terminology where appropriate.
- Format code-related terms correctly (camelCase, snake_case, etc. as appropriate).
- Replace misrecognized words only if they are phonetically similar to a word from the dictionary: <lexicon>{{DICTIONARY}}</lexicon>
- Keep it concise and technical.
- Never modify the meaning or intent.
- Do not generate any comment or introduction.
</instructions>

<input>{{TRANSCRIPT}}</input>
"#;

pub fn get_system_tones() -> Vec<Tone> {
    vec![
        Tone {
            id: "system-general".to_string(),
            name: "General".to_string(),
            prompt: TONE_GENERAL_INSTRUCTIONS.to_string(),
            use_base_prompt: true,
            model: String::new(),
            is_system: true,
            icon: Some("📝".to_string()),
            provider: LLMProviderType::Ollama,
        },
        Tone {
            id: "system-email".to_string(),
            name: "Email".to_string(),
            prompt: TONE_EMAIL_INSTRUCTIONS.to_string(),
            use_base_prompt: true,
            model: String::new(),
            is_system: true,
            icon: Some("📧".to_string()),
            provider: LLMProviderType::Ollama,
        },
        Tone {
            id: "system-code".to_string(),
            name: "Code".to_string(),
            prompt: TONE_CODE_INSTRUCTIONS.to_string(),
            use_base_prompt: true,
            model: String::new(),
            is_system: true,
            icon: Some("💻".to_string()),
            provider: LLMProviderType::Ollama,
        },
    ]
}

fn cloud_providers_settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    if let Err(e) = fs::create_dir_all(&dir) {
        return Err(format!("create_dir_all failed: {}", e));
    }
    Ok(dir.join("cloud_providers.json"))
}

pub fn load_cloud_providers_settings(app: &AppHandle) -> CloudProvidersSettings {
    let path = match cloud_providers_settings_path(app) {
        Ok(p) => p,
        Err(_) => return CloudProvidersSettings::default(),
    };

    match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str::<CloudProvidersSettings>(&content).unwrap_or_default(),
        Err(_) => CloudProvidersSettings::default(),
    }
}

pub fn save_cloud_providers_settings(
    app: &AppHandle,
    settings: &CloudProvidersSettings,
) -> Result<(), String> {
    let path = cloud_providers_settings_path(app)?;
    let content = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}

pub fn compose_prompt(tone: &Tone, base_prompt: &str) -> String {
    if tone.use_base_prompt {
        base_prompt.replace("{{TONE_INSTRUCTIONS}}", &tone.prompt)
    } else {
        tone.prompt.clone()
    }
}

fn llm_connect_settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    if let Err(e) = fs::create_dir_all(&dir) {
        return Err(format!("create_dir_all failed: {}", e));
    }
    Ok(dir.join("llm_connect.json"))
}

pub fn load_llm_connect_settings(app: &AppHandle) -> LLMConnectSettings {
    let path = match llm_connect_settings_path(app) {
        Ok(p) => p,
        Err(_) => return LLMConnectSettings::default(),
    };

    let mut settings = match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str::<LLMConnectSettings>(&content).unwrap_or_default(),
        Err(_) => {
            let defaults = LLMConnectSettings::default();
            let _ = save_llm_connect_settings(app, &defaults);
            defaults
        }
    };

    // Migration / Initialization Logic
    if settings.modes.is_empty() {
        // Use default prompt if the legacy prompt field is empty
        let prompt = if settings.prompt.trim().is_empty() {
            DEFAULT_GENERAL_PROMPT.to_string()
        } else {
            settings.prompt.clone()
        };

        let mode = crate::llm::types::LLMMode {
            name: "General".to_string(),
            prompt,
            model: settings.model.clone(),
            shortcut: "Ctrl+Shift+1".to_string(),
        };
        settings.modes.push(mode);
        settings.active_mode_index = 0;

        // Clear legacy prompt to mark as migrated (optional, but cleaner)
        settings.prompt = String::new();

        let _ = save_llm_connect_settings(app, &settings);
    }

    settings
}

pub fn save_llm_connect_settings(
    app: &AppHandle,
    settings: &LLMConnectSettings,
) -> Result<(), String> {
    let path = llm_connect_settings_path(app)?;
    let content = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}

fn tones_settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    if let Err(e) = fs::create_dir_all(&dir) {
        return Err(format!("create_dir_all failed: {}", e));
    }
    Ok(dir.join("tones_settings.json"))
}

pub fn load_tones_settings(app: &AppHandle) -> TonesSettings {
    let path = match tones_settings_path(app) {
        Ok(p) => p,
        Err(_) => return initialize_default_tones_settings(app),
    };

    match fs::read_to_string(&path) {
        Ok(content) => {
            let mut settings: TonesSettings =
                serde_json::from_str(&content).unwrap_or_else(|_| TonesSettings::default());

            if settings.tones.is_empty() {
                settings = try_migrate_from_llm_modes(app);
                let _ = save_tones_settings(app, &settings);
            }

            if settings.base_prompt.trim().is_empty() {
                settings.base_prompt = DEFAULT_BASE_PROMPT.to_string();
                let _ = save_tones_settings(app, &settings);
            }

            settings
        }
        Err(_) => {
            let settings = try_migrate_from_llm_modes(app);
            let _ = save_tones_settings(app, &settings);
            settings
        }
    }
}

fn try_migrate_from_llm_modes(app: &AppHandle) -> TonesSettings {
    let llm_settings = load_llm_connect_settings(app);

    if !llm_settings.modes.is_empty() {
        let mut settings = migrate_llm_modes_to_tones(&llm_settings);
        for tone in &mut settings.tones {
            if tone.model.is_empty() {
                tone.model = llm_settings.model.clone();
            }
        }
        settings
    } else {
        initialize_default_tones_settings(app)
    }
}

fn initialize_default_tones_settings(app: &AppHandle) -> TonesSettings {
    let llm_settings = load_llm_connect_settings(app);
    let mut tones = get_system_tones();

    for tone in &mut tones {
        if tone.model.is_empty() && !llm_settings.model.is_empty() {
            tone.model = llm_settings.model.clone();
        }
    }

    let default_tone_id = tones.first().map(|t| t.id.clone());

    let settings = TonesSettings {
        base_prompt: DEFAULT_BASE_PROMPT.to_string(),
        tones,
        registered_apps: Vec::new(),
        default_tone_id,
        manual_override_tone_id: None,
    };

    let _ = save_tones_settings(app, &settings);
    settings
}

pub fn save_tones_settings(app: &AppHandle, settings: &TonesSettings) -> Result<(), String> {
    let path = tones_settings_path(app)?;
    let content = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}
