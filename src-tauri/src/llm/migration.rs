use crate::llm::cloud_providers::LLMProviderType;
use crate::llm::helpers::DEFAULT_BASE_PROMPT;
use crate::llm::types::{LLMConnectSettings, Tone, TonesSettings};
use uuid::Uuid;

pub fn migrate_llm_modes_to_tones(old_settings: &LLMConnectSettings) -> TonesSettings {
    let mut tones: Vec<Tone> = Vec::new();

    for mode in old_settings.modes.iter() {
        let tone = Tone {
            id: Uuid::new_v4().to_string(),
            name: mode.name.clone(),
            prompt: mode.prompt.clone(),
            use_base_prompt: false,
            model: mode.model.clone(),
            is_system: false,
            icon: None,
            provider: LLMProviderType::Ollama,
        };
        tones.push(tone);
    }

    let default_tone_id = tones.get(old_settings.active_mode_index).map(|t| t.id.clone());

    TonesSettings {
        base_prompt: DEFAULT_BASE_PROMPT.to_string(),
        tones,
        registered_apps: Vec::new(),
        default_tone_id,
        manual_override_tone_id: None,
    }
}
