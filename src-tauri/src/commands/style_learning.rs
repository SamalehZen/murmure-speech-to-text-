use crate::style_learning::{
    analyze_text, generate_style_prompt, load_style_learning_settings, merge_patterns,
    save_style_learning_settings, StyleLearningSettings, StyleProfile,
};
use tauri::AppHandle;

#[tauri::command]
pub fn get_style_learning_settings(app: AppHandle) -> StyleLearningSettings {
    load_style_learning_settings(&app)
}

#[tauri::command]
pub fn set_style_learning_settings(
    app: AppHandle,
    settings: StyleLearningSettings,
) -> Result<(), String> {
    save_style_learning_settings(&app, &settings)
}

#[tauri::command]
pub fn toggle_style_learning(app: AppHandle, enabled: bool) -> Result<(), String> {
    let mut settings = load_style_learning_settings(&app);
    settings.enabled = enabled;
    save_style_learning_settings(&app, &settings)
}

#[tauri::command]
pub fn get_style_profile(app: AppHandle, app_name: String) -> Option<StyleProfile> {
    let settings = load_style_learning_settings(&app);
    settings.profiles.get(&app_name).cloned()
}

#[tauri::command]
pub fn reset_style_profile(app: AppHandle, app_name: String) -> Result<(), String> {
    let mut settings = load_style_learning_settings(&app);
    settings.profiles.remove(&app_name);
    save_style_learning_settings(&app, &settings)
}

#[tauri::command]
pub fn reset_all_style_profiles(app: AppHandle) -> Result<(), String> {
    let mut settings = load_style_learning_settings(&app);
    settings.profiles.clear();
    save_style_learning_settings(&app, &settings)
}

#[tauri::command]
pub fn toggle_app_style_learning(
    app: AppHandle,
    app_name: String,
    enabled: bool,
) -> Result<(), String> {
    let mut settings = load_style_learning_settings(&app);
    if let Some(profile) = settings.profiles.get_mut(&app_name) {
        profile.enabled = enabled;
    }
    save_style_learning_settings(&app, &settings)
}

#[tauri::command]
pub fn add_excluded_app(app: AppHandle, app_name: String) -> Result<(), String> {
    let mut settings = load_style_learning_settings(&app);
    if !settings.excluded_apps.contains(&app_name) {
        settings.excluded_apps.push(app_name);
    }
    save_style_learning_settings(&app, &settings)
}

#[tauri::command]
pub fn remove_excluded_app(app: AppHandle, app_name: String) -> Result<(), String> {
    let mut settings = load_style_learning_settings(&app);
    settings.excluded_apps.retain(|a| a != &app_name);
    save_style_learning_settings(&app, &settings)
}

#[tauri::command]
pub fn get_style_preview(app: AppHandle, app_name: String) -> Option<String> {
    let settings = load_style_learning_settings(&app);
    if !settings.enabled {
        return None;
    }

    settings.profiles.get(&app_name).and_then(|profile| {
        if profile.enabled && profile.sample_count >= settings.min_samples_for_learning {
            let prompt = generate_style_prompt(&profile.patterns);
            if prompt.is_empty() {
                None
            } else {
                Some(prompt)
            }
        } else {
            None
        }
    })
}

#[tauri::command]
pub fn analyze_sample_text(text: String) -> crate::style_learning::LearnedPatterns {
    analyze_text(&text)
}

#[tauri::command]
pub fn record_style_sample(
    app: AppHandle,
    app_name: String,
    text: String,
) -> Result<StyleProfile, String> {
    let mut settings = load_style_learning_settings(&app);

    if !settings.enabled {
        return Err("Style learning is disabled".to_string());
    }

    if settings.excluded_apps.contains(&app_name) {
        return Err("App is excluded from style learning".to_string());
    }

    let profile = settings
        .profiles
        .entry(app_name.clone())
        .or_insert_with(|| StyleProfile::new(&app_name));

    let new_patterns = analyze_text(&text);
    let weight = 1.0 / (profile.sample_count as f32 + 1.0).min(0.5);
    profile.patterns = merge_patterns(&profile.patterns, &new_patterns, weight);

    profile.examples.push(text);
    if profile.examples.len() > settings.max_examples_stored as usize {
        profile.examples.remove(0);
    }

    profile.sample_count += 1;
    profile.last_updated = chrono::Utc::now().to_rfc3339();

    let result = profile.clone();
    save_style_learning_settings(&app, &settings)?;
    Ok(result)
}
