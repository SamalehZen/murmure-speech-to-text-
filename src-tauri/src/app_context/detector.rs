use super::classifier::classify_app;
use super::prompts::{get_category_name, get_prompt_for_category};
use super::types::{ActiveWindowInfo, AppCategory, DetectedApp};

pub fn get_active_window() -> Result<ActiveWindowInfo, String> {
    #[cfg(target_os = "windows")]
    {
        super::windows::get_active_window()
    }

    #[cfg(target_os = "linux")]
    {
        super::linux::get_active_window()
    }

    #[cfg(target_os = "macos")]
    {
        super::macos::get_active_window()
    }

    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    {
        Err("Platform not supported".to_string())
    }
}

pub fn detect_and_classify() -> Result<DetectedApp, String> {
    let info = get_active_window()?;
    let category = classify_app(&info);
    
    let mut detected = DetectedApp::new(info).with_category(category);

    if let Some(prompt) = get_prompt_for_category(category) {
        let rule_name = get_category_name(category).to_string();
        detected = detected.with_prompt(prompt.to_string(), rule_name);
    }

    Ok(detected)
}

pub fn get_automatic_prompt() -> Option<String> {
    let detected = detect_and_classify().ok()?;
    detected.prompt
}

pub fn get_detected_category() -> AppCategory {
    detect_and_classify()
        .map(|d| d.category)
        .unwrap_or(AppCategory::Default)
}

pub fn get_detected_info() -> Option<(ActiveWindowInfo, AppCategory, Option<String>)> {
    let detected = detect_and_classify().ok()?;
    Some((detected.info, detected.category, detected.prompt))
}
