use log::info;
use std::collections::HashMap;
use tauri::AppHandle;

use super::types::GlobalConfig;
use crate::dictionary;

pub fn apply_cloud_dictionary(app: &AppHandle, config: &GlobalConfig) -> Result<(), String> {
    if config.dictionary.is_empty() {
        info!("No dictionary entries in cloud config to apply");
        return Ok(());
    }

    let mut current_dict = dictionary::load(app).unwrap_or_default();

    for entry in &config.dictionary {
        if !current_dict.contains_key(&entry.written) {
            current_dict.insert(
                entry.written.clone(),
                vec!["english".to_string(), "french".to_string()],
            );
        }
    }

    dictionary::save(app, &current_dict)?;
    info!(
        "Applied {} dictionary entries from cloud config",
        config.dictionary.len()
    );

    Ok(())
}

pub fn get_merged_dictionary(
    app: &AppHandle,
    config: &GlobalConfig,
) -> HashMap<String, Vec<String>> {
    let mut dict = dictionary::load(app).unwrap_or_default();

    for entry in &config.dictionary {
        if !dict.contains_key(&entry.written) {
            dict.insert(
                entry.written.clone(),
                vec!["english".to_string(), "french".to_string()],
            );
        }
    }

    dict
}
