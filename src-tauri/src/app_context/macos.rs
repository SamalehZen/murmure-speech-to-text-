use super::types::ActiveWindowInfo;
use std::process::Command;

pub fn get_active_window() -> Result<ActiveWindowInfo, String> {
    let script = r#"
        use AppleScript version "2.4"
        use framework "Foundation"
        use scripting additions
        
        tell application "System Events"
            set frontApp to first application process whose frontmost is true
            set appName to name of frontApp
            set bundleID to bundle identifier of frontApp
            set windowTitle to ""
            try
                set windowTitle to name of front window of frontApp
            end try
            return appName & "|||" & bundleID & "|||" & windowTitle
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
    let parts: Vec<&str> = result.splitn(3, "|||").collect();

    let app_name = parts.first().map(|s| s.to_string()).unwrap_or_default();
    let bundle_id = parts.get(1).map(|s| s.to_string()).filter(|s| !s.is_empty());
    let window_title = parts.get(2).map(|s| s.to_string()).unwrap_or_default();

    let process_name = get_process_path(&app_name);

    let url = if is_browser(&bundle_id, &app_name) {
        get_browser_url(&bundle_id, &app_name)
    } else {
        None
    };

    Ok(ActiveWindowInfo {
        app_name,
        window_title,
        process_name,
        bundle_id,
        url,
        exe_path: None,
    })
}

fn get_process_path(app_name: &str) -> String {
    let script = r#"
        tell application "System Events"
            set frontApp to first application process whose frontmost is true
            return POSIX path of (file of frontApp as text)
        end tell
        "#;

    Command::new("osascript")
        .args(["-e", script])
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                let path = String::from_utf8_lossy(&o.stdout).trim().to_string();
                std::path::Path::new(&path)
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
            } else {
                None
            }
        })
        .unwrap_or_else(|| app_name.to_string())
}

fn is_browser(bundle_id: &Option<String>, app_name: &str) -> bool {
    let browser_bundles = [
        "com.apple.safari",
        "com.google.chrome",
        "org.mozilla.firefox",
        "org.mozilla.firefoxdeveloperedition",
        "com.brave.browser",
        "com.microsoft.edgemac",
        "com.operasoftware.opera",
        "com.vivaldi.vivaldi",
        "company.thebrowser.browser",
        "org.chromium.chromium",
        "com.nickvision.tuba",
    ];

    if let Some(ref bid) = bundle_id {
        let bid_lower = bid.to_lowercase();
        if browser_bundles.iter().any(|b| bid_lower.contains(b)) {
            return true;
        }
    }

    let browser_names = ["safari", "chrome", "firefox", "brave", "edge", "opera", "vivaldi", "arc"];
    let app_lower = app_name.to_lowercase();
    browser_names.iter().any(|b| app_lower.contains(b))
}

fn get_browser_url(bundle_id: &Option<String>, app_name: &str) -> Option<String> {
    let bid = bundle_id.as_deref().unwrap_or("");
    let app_lower = app_name.to_lowercase();

    if bid.contains("safari") || app_lower.contains("safari") {
        return get_safari_url();
    }

    if bid.contains("chrome") || app_lower.contains("chrome") 
       || bid.contains("chromium") || app_lower.contains("chromium") {
        return get_chrome_url();
    }

    if bid.contains("brave") || app_lower.contains("brave") {
        return get_brave_url();
    }

    if bid.contains("firefox") || app_lower.contains("firefox") {
        return get_firefox_url();
    }

    if bid.contains("edge") || app_lower.contains("edge") {
        return get_edge_url();
    }

    if bid.contains("arc") || bid.contains("thebrowser") || app_lower.contains("arc") {
        return get_arc_url();
    }

    if bid.contains("opera") || app_lower.contains("opera") {
        return get_opera_url();
    }

    if bid.contains("vivaldi") || app_lower.contains("vivaldi") {
        return get_vivaldi_url();
    }

    None
}

fn get_safari_url() -> Option<String> {
    let script = r#"
        tell application "Safari"
            if (count of windows) > 0 then
                return URL of front document
            end if
        end tell
        return ""
    "#;
    execute_url_script(script)
}

fn get_chrome_url() -> Option<String> {
    let script = r#"
        tell application "Google Chrome"
            if (count of windows) > 0 then
                return URL of active tab of front window
            end if
        end tell
        return ""
    "#;
    execute_url_script(script)
}

fn get_brave_url() -> Option<String> {
    let script = r#"
        tell application "Brave Browser"
            if (count of windows) > 0 then
                return URL of active tab of front window
            end if
        end tell
        return ""
    "#;
    execute_url_script(script)
}

fn get_firefox_url() -> Option<String> {
    None
}

fn get_edge_url() -> Option<String> {
    let script = r#"
        tell application "Microsoft Edge"
            if (count of windows) > 0 then
                return URL of active tab of front window
            end if
        end tell
        return ""
    "#;
    execute_url_script(script)
}

fn get_arc_url() -> Option<String> {
    let script = r#"
        tell application "Arc"
            if (count of windows) > 0 then
                return URL of active tab of front window
            end if
        end tell
        return ""
    "#;
    execute_url_script(script)
}

fn get_opera_url() -> Option<String> {
    let script = r#"
        tell application "Opera"
            if (count of windows) > 0 then
                return URL of active tab of front window
            end if
        end tell
        return ""
    "#;
    execute_url_script(script)
}

fn get_vivaldi_url() -> Option<String> {
    let script = r#"
        tell application "Vivaldi"
            if (count of windows) > 0 then
                return URL of active tab of front window
            end if
        end tell
        return ""
    "#;
    execute_url_script(script)
}

fn execute_url_script(script: &str) -> Option<String> {
    Command::new("osascript")
        .args(["-e", script])
        .output()
        .ok()
        .and_then(|output| {
            if output.status.success() {
                let url = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !url.is_empty() && url.starts_with("http") {
                    Some(url)
                } else {
                    None
                }
            } else {
                None
            }
        })
}
