use crate::llm::{self, TemplateSettings, TextTemplate};
use tauri::{command, AppHandle, Emitter};

#[command]
pub fn get_templates(app: AppHandle) -> Vec<TextTemplate> {
    let settings = llm::load_template_settings(&app);
    if settings.templates.is_empty() {
        TextTemplate::default_templates()
    } else {
        settings.templates
    }
}

#[command]
pub fn get_template_settings(app: AppHandle) -> TemplateSettings {
    llm::load_template_settings(&app)
}

#[command]
pub fn set_templates(app: AppHandle, templates: Vec<TextTemplate>) -> Result<(), String> {
    let mut settings = llm::load_template_settings(&app);
    settings.templates = templates;
    llm::save_template_settings(&app, &settings)?;
    let _ = app.emit("templates-updated", &settings);
    Ok(())
}

#[command]
pub fn add_template(app: AppHandle, template: TextTemplate) -> Result<(), String> {
    let mut settings = llm::load_template_settings(&app);
    if settings.templates.iter().any(|t| t.id == template.id) {
        return Err(format!("Template with id '{}' already exists", template.id));
    }
    settings.templates.push(template);
    llm::save_template_settings(&app, &settings)?;
    let _ = app.emit("templates-updated", &settings);
    Ok(())
}

#[command]
pub fn update_template(app: AppHandle, template: TextTemplate) -> Result<(), String> {
    let mut settings = llm::load_template_settings(&app);
    let index = settings
        .templates
        .iter()
        .position(|t| t.id == template.id)
        .ok_or_else(|| format!("Template with id '{}' not found", template.id))?;
    settings.templates[index] = template;
    llm::save_template_settings(&app, &settings)?;
    let _ = app.emit("templates-updated", &settings);
    Ok(())
}

#[command]
pub fn delete_template(app: AppHandle, template_id: String) -> Result<(), String> {
    let mut settings = llm::load_template_settings(&app);
    let original_len = settings.templates.len();
    settings.templates.retain(|t| t.id != template_id);
    if settings.templates.len() == original_len {
        return Err(format!("Template with id '{}' not found", template_id));
    }
    llm::save_template_settings(&app, &settings)?;
    let _ = app.emit("templates-updated", &settings);
    Ok(())
}

#[command]
pub fn get_templates_for_app(app: AppHandle, detected_app: String) -> Vec<TextTemplate> {
    let settings = llm::load_template_settings(&app);
    let templates = if settings.templates.is_empty() {
        TextTemplate::default_templates()
    } else {
        settings.templates
    };
    llm::templates::get_templates_for_app(&templates, &detected_app)
}

#[command]
pub fn toggle_templates(app: AppHandle, enabled: bool) -> Result<(), String> {
    let mut settings = llm::load_template_settings(&app);
    settings.enabled = enabled;
    llm::save_template_settings(&app, &settings)?;
    let _ = app.emit("templates-updated", &settings);
    Ok(())
}

#[command]
pub fn set_template_trigger_prefix(
    app: AppHandle,
    prefix: Option<String>,
) -> Result<(), String> {
    let mut settings = llm::load_template_settings(&app);
    settings.trigger_prefix = prefix;
    llm::save_template_settings(&app, &settings)?;
    let _ = app.emit("templates-updated", &settings);
    Ok(())
}

#[command]
pub fn export_templates(app: AppHandle) -> Result<String, String> {
    let settings = llm::load_template_settings(&app);
    serde_json::to_string_pretty(&settings.templates).map_err(|e| e.to_string())
}

#[command]
pub fn import_templates(
    app: AppHandle,
    json_content: String,
    replace: bool,
) -> Result<(), String> {
    let imported: Vec<TextTemplate> =
        serde_json::from_str(&json_content).map_err(|e| format!("Invalid JSON: {}", e))?;

    let mut settings = llm::load_template_settings(&app);
    if replace {
        settings.templates = imported;
    } else {
        for template in imported {
            if !settings.templates.iter().any(|t| t.id == template.id) {
                settings.templates.push(template);
            }
        }
    }
    llm::save_template_settings(&app, &settings)?;
    let _ = app.emit("templates-updated", &settings);
    Ok(())
}

#[command]
pub fn reset_templates_to_default(app: AppHandle) -> Result<(), String> {
    let mut settings = llm::load_template_settings(&app);
    settings.templates = TextTemplate::default_templates();
    llm::save_template_settings(&app, &settings)?;
    let _ = app.emit("templates-updated", &settings);
    Ok(())
}
