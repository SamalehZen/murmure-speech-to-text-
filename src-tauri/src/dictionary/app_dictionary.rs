use crate::app_context::{get_cached_active_window, ActiveWindowInfo};
use log::debug;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DictionaryTerm {
    pub spoken: Vec<String>,
    pub written: String,
    #[serde(default)]
    pub context: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppDictionary {
    pub id: String,
    pub name: String,
    pub app_patterns: Vec<String>,
    pub terms: Vec<DictionaryTerm>,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppDictionarySettings {
    pub dictionaries: Vec<AppDictionary>,
    #[serde(default)]
    pub app_dictionary_overrides: HashMap<String, String>,
}

fn get_app_dictionaries_path(app: &AppHandle) -> PathBuf {
    let data_dir = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    data_dir.join("app_dictionaries.json")
}

pub fn load_app_dictionary_settings(app: &AppHandle) -> AppDictionarySettings {
    let path = get_app_dictionaries_path(app);
    
    match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(_) => AppDictionarySettings::default(),
    }
}

pub fn save_app_dictionary_settings(
    app: &AppHandle,
    settings: &AppDictionarySettings,
) -> Result<(), String> {
    let path = get_app_dictionaries_path(app);
    
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    
    let content = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())
}

pub fn find_matching_dictionary<'a>(
    settings: &'a AppDictionarySettings,
    window_info: &ActiveWindowInfo,
) -> Option<&'a AppDictionary> {
    let detected_app = window_info.detected_app.as_deref();
    let app_name_lower = window_info.app_name.to_lowercase();
    let title_lower = window_info.window_title.to_lowercase();
    
    if let Some(app_name) = detected_app {
        if let Some(override_id) = settings.app_dictionary_overrides.get(app_name) {
            if let Some(dict) = settings
                .dictionaries
                .iter()
                .find(|d| d.enabled && d.id == *override_id)
            {
                debug!("Using override dictionary '{}' for app '{}'", dict.name, app_name);
                return Some(dict);
            }
        }
    }
    
    for dict in &settings.dictionaries {
        if !dict.enabled {
            continue;
        }
        
        for pattern in &dict.app_patterns {
            let pattern_lower = pattern.to_lowercase();
            
            if let Some(app) = detected_app {
                if app.to_lowercase() == pattern_lower || app.to_lowercase().contains(&pattern_lower) {
                    debug!("Matched dictionary '{}' via detected_app '{}'", dict.name, app);
                    return Some(dict);
                }
            }
            
            if app_name_lower.contains(&pattern_lower) || title_lower.contains(&pattern_lower) {
                debug!("Matched dictionary '{}' via pattern '{}'", dict.name, pattern);
                return Some(dict);
            }
        }
    }
    
    None
}

pub fn get_app_specific_dictionary(app: &AppHandle) -> Option<HashMap<String, Vec<String>>> {
    let window_info = match get_cached_active_window() {
        Ok(info) => info,
        Err(e) => {
            debug!("Could not get active window for app dictionary: {}", e);
            return None;
        }
    };
    
    let settings = load_app_dictionary_settings(app);
    let matched_dict = find_matching_dictionary(&settings, &window_info)?;
    
    Some(convert_app_dictionary_to_hashmap(matched_dict))
}

pub fn convert_app_dictionary_to_hashmap(dict: &AppDictionary) -> HashMap<String, Vec<String>> {
    let mut result = HashMap::new();
    
    for term in &dict.terms {
        result.insert(term.written.clone(), term.spoken.clone());
    }
    
    result
}

pub fn merge_dictionaries(
    global: HashMap<String, Vec<String>>,
    app_specific: Option<HashMap<String, Vec<String>>>,
) -> HashMap<String, Vec<String>> {
    let mut merged = global;
    
    if let Some(app_dict) = app_specific {
        for (key, values) in app_dict {
            merged.insert(key, values);
        }
    }
    
    merged
}

pub fn test_dictionary_term_match(
    app: &AppHandle,
    spoken_input: &str,
    dictionary_id: &str,
) -> Option<String> {
    let settings = load_app_dictionary_settings(app);
    
    let dict = settings.dictionaries.iter().find(|d| d.id == dictionary_id)?;
    let spoken_lower = spoken_input.to_lowercase().trim().to_string();
    
    for term in &dict.terms {
        for spoken_variant in &term.spoken {
            if spoken_variant.to_lowercase() == spoken_lower {
                return Some(term.written.clone());
            }
        }
    }
    
    None
}

pub fn get_dictionary_for_detected_app(
    app: &AppHandle,
    detected_app: &str,
) -> Option<AppDictionary> {
    let settings = load_app_dictionary_settings(app);
    let detected_lower = detected_app.to_lowercase();
    
    if let Some(override_id) = settings.app_dictionary_overrides.get(detected_app) {
        if let Some(dict) = settings
            .dictionaries
            .iter()
            .find(|d| d.enabled && d.id == *override_id)
        {
            return Some(dict.clone());
        }
    }
    
    for dict in &settings.dictionaries {
        if !dict.enabled {
            continue;
        }
        
        for pattern in &dict.app_patterns {
            if detected_lower == pattern.to_lowercase() || detected_lower.contains(&pattern.to_lowercase()) {
                return Some(dict.clone());
            }
        }
    }
    
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_settings() -> AppDictionarySettings {
        AppDictionarySettings {
            dictionaries: vec![
                AppDictionary {
                    id: "dev".to_string(),
                    name: "Development".to_string(),
                    app_patterns: vec!["Visual Studio Code".to_string(), "IntelliJ".to_string()],
                    terms: vec![
                        DictionaryTerm {
                            spoken: vec!["use state".to_string(), "use estate".to_string()],
                            written: "useState".to_string(),
                            context: None,
                        },
                    ],
                    enabled: true,
                },
                AppDictionary {
                    id: "slack".to_string(),
                    name: "Communication".to_string(),
                    app_patterns: vec!["Slack".to_string(), "Discord".to_string()],
                    terms: vec![
                        DictionaryTerm {
                            spoken: vec!["pr".to_string(), "pull request".to_string()],
                            written: "PR".to_string(),
                            context: None,
                        },
                    ],
                    enabled: true,
                },
            ],
            app_dictionary_overrides: HashMap::new(),
        }
    }

    #[test]
    fn test_find_matching_dictionary_by_detected_app() {
        let settings = create_test_settings();
        let window = ActiveWindowInfo {
            app_name: "code".to_string(),
            window_title: "test.rs - Visual Studio Code".to_string(),
            process_name: "code.exe".to_string(),
            process_path: String::new(),
            window_class: String::new(),
            browser_url: None,
            detected_app: Some("Visual Studio Code".to_string()),
        };

        let result = find_matching_dictionary(&settings, &window);
        assert!(result.is_some());
        assert_eq!(result.unwrap().id, "dev");
    }

    #[test]
    fn test_merge_dictionaries_app_takes_precedence() {
        let mut global = HashMap::new();
        global.insert("test".to_string(), vec!["global".to_string()]);
        global.insert("only_global".to_string(), vec!["value".to_string()]);

        let mut app_specific = HashMap::new();
        app_specific.insert("test".to_string(), vec!["app_specific".to_string()]);
        app_specific.insert("only_app".to_string(), vec!["value".to_string()]);

        let merged = merge_dictionaries(global, Some(app_specific));

        assert_eq!(merged.get("test").unwrap(), &vec!["app_specific".to_string()]);
        assert!(merged.contains_key("only_global"));
        assert!(merged.contains_key("only_app"));
    }

    #[test]
    fn test_convert_app_dictionary_to_hashmap() {
        let dict = AppDictionary {
            id: "test".to_string(),
            name: "Test".to_string(),
            app_patterns: vec![],
            terms: vec![
                DictionaryTerm {
                    spoken: vec!["hello".to_string(), "hi".to_string()],
                    written: "Hello".to_string(),
                    context: None,
                },
            ],
            enabled: true,
        };

        let hashmap = convert_app_dictionary_to_hashmap(&dict);
        assert_eq!(hashmap.get("Hello").unwrap(), &vec!["hello".to_string(), "hi".to_string()]);
    }
}
