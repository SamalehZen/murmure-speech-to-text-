use super::types::ActiveWindowInfo;
use std::process::Command;

pub fn get_active_window() -> Result<ActiveWindowInfo, String> {
    let output = Command::new("xdotool")
        .args(["getactivewindow", "getwindowname"])
        .output();

    let window_title = match output {
        Ok(out) if out.status.success() => {
            String::from_utf8_lossy(&out.stdout).trim().to_string()
        }
        _ => String::new(),
    };

    let window_class = Command::new("xdotool")
        .args(["getactivewindow", "getwindowclassname"])
        .output()
        .ok()
        .filter(|out| out.status.success())
        .map(|out| String::from_utf8_lossy(&out.stdout).trim().to_string())
        .unwrap_or_default();

    let pid_output = Command::new("xdotool")
        .args(["getactivewindow", "getwindowpid"])
        .output();

    let (app_name, process_name, process_path) = match pid_output {
        Ok(out) if out.status.success() => {
            let pid = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !pid.is_empty() {
                let comm_output = Command::new("cat")
                    .arg(format!("/proc/{}/comm", pid))
                    .output();

                let process_name = match comm_output {
                    Ok(out) if out.status.success() => {
                        String::from_utf8_lossy(&out.stdout).trim().to_string()
                    }
                    _ => String::new(),
                };

                let process_path = std::fs::read_link(format!("/proc/{}/exe", pid))
                    .ok()
                    .map(|p| p.to_string_lossy().to_string())
                    .unwrap_or_default();

                (process_name.clone(), process_name, process_path)
            } else {
                (String::new(), String::new(), String::new())
            }
        }
        _ => get_fallback_process_info(&window_title),
    };

    let mut info = ActiveWindowInfo {
        app_name,
        window_title,
        process_name,
        process_path,
        window_class,
        browser_url: None,
        detected_app: None,
    };

    info.extract_browser_url();

    Ok(info)
}

fn get_fallback_process_info(window_title: &str) -> (String, String, String) {
    let wmctrl_output = Command::new("wmctrl").args(["-l", "-p"]).output();

    match wmctrl_output {
        Ok(out) if out.status.success() => {
            let active_id = Command::new("xdotool")
                .arg("getactivewindow")
                .output()
                .ok()
                .and_then(|o| String::from_utf8(o.stdout).ok())
                .map(|s| s.trim().to_string())
                .unwrap_or_default();

            if !active_id.is_empty() {
                if let Ok(id) = active_id.parse::<u64>() {
                    let hex_id = format!("0x{:08x}", id);
                    let output_str = String::from_utf8_lossy(&out.stdout);
                    for line in output_str.lines() {
                        if line.starts_with(&hex_id) {
                            let parts: Vec<&str> = line.split_whitespace().collect();
                            if parts.len() >= 3 {
                                let pid = parts[2];
                                if let Ok(out) =
                                    Command::new("cat").arg(format!("/proc/{}/comm", pid)).output()
                                {
                                    if out.status.success() {
                                        let process =
                                            String::from_utf8_lossy(&out.stdout).trim().to_string();
                                        let process_path =
                                            std::fs::read_link(format!("/proc/{}/exe", pid))
                                                .ok()
                                                .map(|p| p.to_string_lossy().to_string())
                                                .unwrap_or_default();
                                        return (process.clone(), process, process_path);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            (String::new(), String::new(), String::new())
        }
        _ => (String::new(), String::new(), String::new()),
    }
}
