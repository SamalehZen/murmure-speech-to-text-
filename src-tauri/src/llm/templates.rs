use crate::llm::types::{TemplateSettings, TextTemplate};
use log::info;
use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager};

fn templates_settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    if let Err(e) = fs::create_dir_all(&dir) {
        return Err(format!("create_dir_all failed: {}", e));
    }
    Ok(dir.join("templates.json"))
}

pub fn load_template_settings(app: &AppHandle) -> TemplateSettings {
    let path = match templates_settings_path(app) {
        Ok(p) => p,
        Err(_) => return TemplateSettings::default(),
    };

    match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str::<TemplateSettings>(&content).unwrap_or_default(),
        Err(_) => {
            let defaults = TemplateSettings::default();
            let _ = save_template_settings(app, &defaults);
            defaults
        }
    }
}

pub fn save_template_settings(app: &AppHandle, settings: &TemplateSettings) -> Result<(), String> {
    let path = templates_settings_path(app)?;
    let content = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}

pub fn detect_and_apply_template(
    text: &str,
    detected_app: Option<&str>,
    templates: &[TextTemplate],
) -> Option<TextTemplate> {
    let text_lower = text.to_lowercase();

    for template in templates {
        if !template.app_patterns.is_empty() {
            if let Some(app) = detected_app {
                let app_matches = template
                    .app_patterns
                    .iter()
                    .any(|p| app.to_lowercase().contains(&p.to_lowercase()));
                if !app_matches {
                    continue;
                }
            }
        }

        for trigger in &template.trigger_words {
            if text_lower.contains(&trigger.to_lowercase()) {
                info!(
                    "Template '{}' matched with trigger '{}' for app {:?}",
                    template.name, trigger, detected_app
                );
                return Some(template.clone());
            }
        }
    }
    None
}

pub fn get_templates_for_app(templates: &[TextTemplate], detected_app: &str) -> Vec<TextTemplate> {
    templates
        .iter()
        .filter(|t| {
            t.app_patterns.is_empty()
                || t.app_patterns
                    .iter()
                    .any(|p| detected_app.to_lowercase().contains(&p.to_lowercase()))
        })
        .cloned()
        .collect()
}
