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

    let pid_output = Command::new("xdotool")
        .args(["getactivewindow", "getwindowpid"])
        .output();

    let (app_name, process_name) = match pid_output {
        Ok(out) if out.status.success() => {
            let pid = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !pid.is_empty() {
                let comm_output = Command::new("cat")
                    .arg(format!("/proc/{}/comm", pid))
                    .output();
                
                match comm_output {
                    Ok(out) if out.status.success() => {
                        let process = String::from_utf8_lossy(&out.stdout).trim().to_string();
                        (process.clone(), process)
                    }
                    _ => (String::new(), String::new()),
                }
            } else {
                (String::new(), String::new())
            }
        }
        _ => {
            let wmctrl_output = Command::new("wmctrl")
                .args(["-l", "-p"])
                .output();

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
                                        if let Ok(out) = Command::new("cat")
                                            .arg(format!("/proc/{}/comm", pid))
                                            .output()
                                        {
                                            if out.status.success() {
                                                let process = String::from_utf8_lossy(&out.stdout)
                                                    .trim()
                                                    .to_string();
                                                return Ok(ActiveWindowInfo {
                                                    app_name: process.clone(),
                                                    window_title,
                                                    process_name: process,
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    (String::new(), String::new())
                }
                _ => (String::new(), String::new()),
            }
        }
    };

    Ok(ActiveWindowInfo {
        app_name,
        window_title,
        process_name,
    })
}
