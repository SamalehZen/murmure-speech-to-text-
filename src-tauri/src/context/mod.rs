mod browser_url;
mod types;

pub use browser_url::get_browser_context;
pub use types::{BrowserContext, RecordingContext};

use once_cell::sync::Lazy;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};

static RECORDING_CONTEXT: Lazy<Mutex<Option<RecordingContext>>> = Lazy::new(|| Mutex::new(None));

pub fn set_recording_context(ctx: RecordingContext) {
    *RECORDING_CONTEXT.lock() = Some(ctx);
}

pub fn take_recording_context() -> Option<RecordingContext> {
    RECORDING_CONTEXT.lock().take()
}

pub fn capture_context_at_record_start(app_name: &str, window_title: &str) -> RecordingContext {
    let browser = get_browser_context(app_name);
    RecordingContext {
        browser,
        window_title: window_title.to_string(),
        app_name: app_name.to_string(),
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CurrentContext {
    pub app_name: String,
    pub window_title: String,
    pub browser_context: BrowserContext,
}

pub fn get_current_context() -> Option<CurrentContext> {
    let (app_name, window_title) = get_active_window_info();
    if app_name.is_empty() {
        return None;
    }

    let browser_context = get_browser_context(&app_name);

    Some(CurrentContext {
        app_name,
        window_title,
        browser_context,
    })
}

#[cfg(target_os = "macos")]
fn get_active_window_info() -> (String, String) {
    use std::process::Command;

    let script = r#"tell application "System Events"
    set frontApp to first application process whose frontmost is true
    set appName to name of frontApp
    set windowTitle to ""
    try
        set windowTitle to name of front window of frontApp
    end try
    return appName & "|||" & windowTitle
end tell"#;

    let output = Command::new("osascript")
        .args(["-e", script])
        .output();

    match output {
        Ok(out) if out.status.success() => {
            let result = String::from_utf8_lossy(&out.stdout).trim().to_string();
            let parts: Vec<&str> = result.splitn(2, "|||").collect();
            if parts.len() == 2 {
                (parts[0].to_string(), parts[1].to_string())
            } else {
                (result, String::new())
            }
        }
        _ => (String::new(), String::new()),
    }
}

#[cfg(target_os = "windows")]
fn get_active_window_info() -> (String, String) {
    use std::process::Command;

    let script = r#"
$foreground = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
Add-Type @'
    using System;
    using System.Runtime.InteropServices;
    using System.Text;
    public class WindowHelper {
        [DllImport("user32.dll")]
        public static extern IntPtr GetForegroundWindow();
        [DllImport("user32.dll")]
        public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
        [DllImport("user32.dll", SetLastError=true)]
        public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    }
'@
$hwnd = [WindowHelper]::GetForegroundWindow()
$title = New-Object System.Text.StringBuilder 256
[void][WindowHelper]::GetWindowText($hwnd, $title, 256)
$processId = 0
[void][WindowHelper]::GetWindowThreadProcessId($hwnd, [ref]$processId)
$process = Get-Process -Id $processId -ErrorAction SilentlyContinue
$appName = if ($process) { $process.ProcessName } else { "" }
Write-Output "$appName|||$($title.ToString())"
"#;

    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .output();

    match output {
        Ok(out) if out.status.success() => {
            let result = String::from_utf8_lossy(&out.stdout).trim().to_string();
            let parts: Vec<&str> = result.splitn(2, "|||").collect();
            if parts.len() == 2 {
                (parts[0].to_string(), parts[1].to_string())
            } else {
                (result, String::new())
            }
        }
        _ => (String::new(), String::new()),
    }
}

#[cfg(target_os = "linux")]
fn get_active_window_info() -> (String, String) {
    (String::new(), String::new())
}
