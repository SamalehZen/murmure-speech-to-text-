use crate::dictionary::{
    self, load_app_dictionary_settings, save_app_dictionary_settings, test_dictionary_term_match,
    AppDictionary, AppDictionarySettings, Dictionary, DictionaryTerm,
};
use crate::settings;
use std::collections::HashMap;
use tauri::{command, AppHandle, Emitter, Manager};

#[command]
pub fn set_dictionary(app: AppHandle, dictionary: Vec<String>) -> Result<(), String> {
    let mut s = settings::load_settings(&app);
    if !s.onboarding.added_dictionary_word && !dictionary.is_empty() {
        s.onboarding.added_dictionary_word = true;
        settings::save_settings(&app, &s)?;
    }

    let mut words = HashMap::new();
    for word in dictionary {
        words
            .entry(word)
            .or_insert(vec!["english".to_string(), "french".to_string()]);
    }
    dictionary::save(&app, &words)?;
    app.state::<Dictionary>().set(words.clone());

    let _ = app.emit("dictionary:updated", ());

    Ok(())
}

#[command]
pub fn get_dictionary(app: AppHandle) -> Result<Vec<String>, String> {
    let dictionary = dictionary::load(&app)?;
    let words = dictionary.into_keys().collect();
    Ok(words)
}

#[command]
pub fn export_dictionary(app: AppHandle, file_path: String) -> Result<(), String> {
    dictionary::export_dictionary(&app, file_path)?;
    Ok(())
}

#[command]
pub fn import_dictionary(app: AppHandle, file_path: String) -> Result<(), String> {
    dictionary::import_dictionary(&app, file_path)?;

    let _ = app.emit("dictionary:updated", ());
    Ok(())
}

#[command]
pub fn get_app_dictionaries(app: AppHandle) -> AppDictionarySettings {
    load_app_dictionary_settings(&app)
}

#[command]
pub fn set_app_dictionaries(
    app: AppHandle,
    dictionaries: Vec<AppDictionary>,
) -> Result<(), String> {
    let mut settings = load_app_dictionary_settings(&app);
    settings.dictionaries = dictionaries;
    save_app_dictionary_settings(&app, &settings)?;

    let _ = app.emit("app-dictionaries:updated", ());
    Ok(())
}

#[command]
pub fn add_app_dictionary_term(
    app: AppHandle,
    dictionary_id: String,
    term: DictionaryTerm,
) -> Result<(), String> {
    let mut settings = load_app_dictionary_settings(&app);

    let dict = settings
        .dictionaries
        .iter_mut()
        .find(|d| d.id == dictionary_id)
        .ok_or_else(|| format!("Dictionary '{}' not found", dictionary_id))?;

    if dict.terms.iter().any(|t| t.written == term.written) {
        return Err(format!("Term '{}' already exists in dictionary", term.written));
    }

    dict.terms.push(term);
    save_app_dictionary_settings(&app, &settings)?;

    let _ = app.emit("app-dictionaries:updated", ());
    Ok(())
}

#[command]
pub fn remove_app_dictionary_term(
    app: AppHandle,
    dictionary_id: String,
    written: String,
) -> Result<(), String> {
    let mut settings = load_app_dictionary_settings(&app);

    let dict = settings
        .dictionaries
        .iter_mut()
        .find(|d| d.id == dictionary_id)
        .ok_or_else(|| format!("Dictionary '{}' not found", dictionary_id))?;

    let original_len = dict.terms.len();
    dict.terms.retain(|t| t.written != written);

    if dict.terms.len() == original_len {
        return Err(format!("Term '{}' not found in dictionary", written));
    }

    save_app_dictionary_settings(&app, &settings)?;

    let _ = app.emit("app-dictionaries:updated", ());
    Ok(())
}

#[command]
pub fn get_dictionary_for_app(app: AppHandle, detected_app: String) -> Option<AppDictionary> {
    dictionary::get_dictionary_for_detected_app(&app, &detected_app)
}

#[command]
pub fn test_app_dictionary_term(
    app: AppHandle,
    spoken: String,
    dictionary_id: String,
) -> Option<String> {
    test_dictionary_term_match(&app, &spoken, &dictionary_id)
}

#[command]
pub fn set_app_dictionary_override(
    app: AppHandle,
    app_name: String,
    dictionary_id: Option<String>,
) -> Result<(), String> {
    let mut settings = load_app_dictionary_settings(&app);

    match dictionary_id {
        Some(id) => {
            if !settings.dictionaries.iter().any(|d| d.id == id) {
                return Err(format!("Dictionary '{}' not found", id));
            }
            settings.app_dictionary_overrides.insert(app_name, id);
        }
        None => {
            settings.app_dictionary_overrides.remove(&app_name);
        }
    }

    save_app_dictionary_settings(&app, &settings)?;

    let _ = app.emit("app-dictionaries:updated", ());
    Ok(())
}

#[command]
pub fn export_app_dictionaries(app: AppHandle, file_path: String) -> Result<(), String> {
    let settings = load_app_dictionary_settings(&app);
    let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    std::fs::write(&file_path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub fn import_app_dictionaries(app: AppHandle, file_path: String) -> Result<(), String> {
    let content = std::fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    let imported: AppDictionarySettings =
        serde_json::from_str(&content).map_err(|e| format!("Invalid JSON format: {}", e))?;

    save_app_dictionary_settings(&app, &imported)?;

    let _ = app.emit("app-dictionaries:updated", ());
    Ok(())
}
