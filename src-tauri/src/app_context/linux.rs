use super::types::ActiveWindowInfo;
use std::process::Command;

pub fn get_active_window() -> Result<ActiveWindowInfo, String> {
    let window_title = get_window_title();
    let (app_name, process_name) = get_process_info();

    let url = if is_browser(&process_name) {
        get_browser_url(&process_name)
    } else {
        None
    };

    Ok(ActiveWindowInfo {
        app_name,
        window_title,
        process_name,
        bundle_id: None,
        url,
        exe_path: None,
    })
}

fn get_window_title() -> String {
    Command::new("xdotool")
        .args(["getactivewindow", "getwindowname"])
        .output()
        .ok()
        .filter(|out| out.status.success())
        .map(|out| String::from_utf8_lossy(&out.stdout).trim().to_string())
        .unwrap_or_default()
}

fn get_process_info() -> (String, String) {
    let pid = get_active_window_pid();
    
    if let Some(pid) = pid {
        if let Some(process) = get_process_name_from_pid(&pid) {
            return (process.clone(), process);
        }
    }

    get_process_from_wmctrl()
}

fn get_active_window_pid() -> Option<String> {
    Command::new("xdotool")
        .args(["getactivewindow", "getwindowpid"])
        .output()
        .ok()
        .filter(|out| out.status.success())
        .map(|out| String::from_utf8_lossy(&out.stdout).trim().to_string())
        .filter(|pid| !pid.is_empty())
}

fn get_process_name_from_pid(pid: &str) -> Option<String> {
    Command::new("cat")
        .arg(format!("/proc/{}/comm", pid))
        .output()
        .ok()
        .filter(|out| out.status.success())
        .map(|out| String::from_utf8_lossy(&out.stdout).trim().to_string())
        .filter(|name| !name.is_empty())
}

fn get_process_from_wmctrl() -> (String, String) {
    let wmctrl_output = match Command::new("wmctrl").args(["-l", "-p"]).output() {
        Ok(out) if out.status.success() => out,
        _ => return (String::new(), String::new()),
    };

    let active_id = Command::new("xdotool")
        .arg("getactivewindow")
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string())
        .unwrap_or_default();

    if active_id.is_empty() {
        return (String::new(), String::new());
    }

    let id = match active_id.parse::<u64>() {
        Ok(id) => id,
        Err(_) => return (String::new(), String::new()),
    };

    let hex_id = format!("0x{:08x}", id);
    let output_str = String::from_utf8_lossy(&wmctrl_output.stdout);

    for line in output_str.lines() {
        if line.starts_with(&hex_id) {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 3 {
                if let Some(process) = get_process_name_from_pid(parts[2]) {
                    return (process.clone(), process);
                }
            }
        }
    }

    (String::new(), String::new())
}

fn is_browser(process_name: &str) -> bool {
    let name_lower = process_name.to_lowercase();
    let browser_processes = [
        "chrome", "chromium", "firefox", "brave", "opera", "vivaldi",
        "epiphany", "midori", "falkon", "konqueror", "qutebrowser",
        "librewolf", "waterfox", "floorp", "zen-browser"
    ];
    browser_processes.iter().any(|b| name_lower.contains(b))
}

fn get_browser_url(process_name: &str) -> Option<String> {
    let name_lower = process_name.to_lowercase();

    if name_lower.contains("firefox") || name_lower.contains("librewolf") 
       || name_lower.contains("waterfox") || name_lower.contains("floorp") {
        return get_firefox_url_linux();
    }

    if name_lower.contains("chrome") || name_lower.contains("chromium")
       || name_lower.contains("brave") || name_lower.contains("vivaldi")
       || name_lower.contains("opera") {
        return get_chromium_url_linux();
    }

    None
}

fn get_firefox_url_linux() -> Option<String> {
    let script = r#"
        const { Management } = ChromeUtils.importESModule("resource://gre/modules/Management.sys.mjs");
        const currentWindow = Services.wm.getMostRecentWindow("navigator:browser");
        if (currentWindow && currentWindow.gBrowser) {
            currentWindow.gBrowser.currentURI.spec;
        }
    "#;

    Command::new("firefox")
        .args(["--jsconsole", "-e", script])
        .output()
        .ok()
        .filter(|out| out.status.success())
        .and_then(|out| {
            let url = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if url.starts_with("http") {
                Some(url)
            } else {
                None
            }
        })
}

fn get_chromium_url_linux() -> Option<String> {
    let xdotool_output = Command::new("xdotool")
        .args(["getactivewindow", "getwindowname"])
        .output()
        .ok()?;

    if !xdotool_output.status.success() {
        return None;
    }

    let title = String::from_utf8_lossy(&xdotool_output.stdout).trim().to_string();

    if let Some(url) = extract_url_from_title(&title) {
        return Some(url);
    }

    None
}

fn extract_url_from_title(title: &str) -> Option<String> {
    let patterns = [
        " - Google Chrome",
        " - Chromium",
        " - Brave",
        " - Vivaldi",
        " - Opera",
        " — Mozilla Firefox",
        " - Mozilla Firefox",
    ];

    for pattern in patterns {
        if title.ends_with(pattern) {
            let page_title = title.strip_suffix(pattern)?;
            
            if page_title.contains("google.com") || page_title.contains("gmail")
               || page_title.contains(".com") || page_title.contains(".org") {
                return Some(format!("https://{}", page_title.split_whitespace().last()?));
            }
        }
    }

    None
}
