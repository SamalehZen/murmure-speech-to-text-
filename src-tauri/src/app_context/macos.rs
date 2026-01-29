use super::types::ActiveWindowInfo;
use std::process::Command;

pub fn get_active_window() -> Result<ActiveWindowInfo, String> {
    let script = r#"
        tell application "System Events"
            set frontApp to first application process whose frontmost is true
            set appName to name of frontApp
            set windowTitle to ""
            try
                set windowTitle to name of front window of frontApp
            end try
            return appName & "|||" & windowTitle
        end tell
    "#;

    let output = Command::new("osascript")
        .args(["-e", script])
        .output()
        .map_err(|e| format!("Failed to execute osascript: {}", e))?;

    if !output.status.success() {
        return Err("osascript failed".to_string());
    }

    let result = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let parts: Vec<&str> = result.splitn(2, "|||").collect();

    let app_name = parts.first().map(|s| s.to_string()).unwrap_or_default();
    let window_title = parts.get(1).map(|s| s.to_string()).unwrap_or_default();

    let bundle_script = r#"
        tell application "System Events"
            set frontApp to first application process whose frontmost is true
            return POSIX path of (file of frontApp as text)
        end tell
    "#;

    let (process_name, process_path) = Command::new("osascript")
        .args(["-e", bundle_script])
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                let path = String::from_utf8_lossy(&o.stdout).trim().to_string();
                let name = std::path::Path::new(&path)
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_else(|| app_name.clone());
                Some((name, path))
            } else {
                None
            }
        })
        .unwrap_or_else(|| (app_name.clone(), String::new()));

    let mut info = ActiveWindowInfo {
        app_name,
        window_title,
        process_name,
        process_path,
        window_class: String::new(),
        browser_url: None,
    };

    info.extract_browser_url();

    Ok(info)
}
