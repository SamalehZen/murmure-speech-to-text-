use super::types::BrowserContext;
use log::debug;

#[allow(dead_code)]
struct BrowserInfo {
    display_name: &'static str,
    aliases: &'static [&'static str],
}

const SUPPORTED_BROWSERS: &[BrowserInfo] = &[
    BrowserInfo {
        display_name: "Google Chrome",
        aliases: &["google chrome", "chrome"],
    },
    BrowserInfo {
        display_name: "Safari",
        aliases: &["safari"],
    },
    BrowserInfo {
        display_name: "Arc",
        aliases: &["arc"],
    },
    BrowserInfo {
        display_name: "Microsoft Edge",
        aliases: &["microsoft edge", "msedge", "edge"],
    },
    BrowserInfo {
        display_name: "Brave Browser",
        aliases: &["brave browser", "brave"],
    },
    BrowserInfo {
        display_name: "Firefox",
        aliases: &["firefox"],
    },
];

#[allow(dead_code)]
fn normalize_url(url: &str) -> String {
    let trimmed = url.trim();
    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        trimmed.to_string()
    } else {
        format!("https://{}", trimmed)
    }
}

#[allow(dead_code)]
fn extract_domain(url: &str) -> Option<String> {
    url::Url::parse(url)
        .ok()
        .and_then(|u| u.host_str().map(|s| s.to_string()))
}

fn match_browser(app_name: &str) -> Option<String> {
    let app_lower = app_name.to_lowercase();
    SUPPORTED_BROWSERS
        .iter()
        .find(|b| b.aliases.iter().any(|alias| app_lower.contains(alias)))
        .map(|b| b.display_name.to_string())
}

#[cfg(target_os = "macos")]
fn extract_url_macos(browser_name: &str) -> Option<String> {
    use std::process::Command;

    let script = match browser_name {
        "Google Chrome" => r#"tell application "Google Chrome"
            if (count of windows) > 0 then
                return URL of active tab of front window
            end if
        end tell"#,
        "Safari" => r#"tell application "Safari"
            if (count of windows) > 0 then
                return URL of current tab of front window
            end if
        end tell"#,
        "Arc" => r#"tell application "Arc"
            if (count of windows) > 0 then
                return URL of active tab of front window
            end if
        end tell"#,
        "Microsoft Edge" => r#"tell application "Microsoft Edge"
            if (count of windows) > 0 then
                return URL of active tab of front window
            end if
        end tell"#,
        "Brave Browser" => r#"tell application "Brave Browser"
            if (count of windows) > 0 then
                return URL of active tab of front window
            end if
        end tell"#,
        "Firefox" => r#"tell application "Firefox"
            if (count of windows) > 0 then
                return URL of active tab of front window
            end if
        end tell"#,
        _ => return None,
    };

    let output = Command::new("osascript")
        .args(["-e", script])
        .output()
        .ok()?;

    if output.status.success() {
        let url = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !url.is_empty() {
            Some(url)
        } else {
            None
        }
    } else {
        None
    }
}

#[cfg(target_os = "windows")]
fn extract_url_windows(browser_name: &str) -> Option<String> {
    use std::process::Command;

    let process_name = match browser_name {
        "Google Chrome" => "chrome",
        "Firefox" => "firefox",
        "Microsoft Edge" => "msedge",
        "Brave Browser" => "brave",
        _ => return None,
    };

    let script = format!(
        r#"
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$process = Get-Process -Name "{}" -ErrorAction SilentlyContinue |
    Where-Object {{ $_.MainWindowHandle -ne 0 }} |
    Select-Object -First 1

if (-not $process) {{ return }}

try {{
    $element = [System.Windows.Automation.AutomationElement]::FromHandle($process.MainWindowHandle)
    $condition = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        [System.Windows.Automation.ControlType]::Edit
    )
    $addressBar = $element.FindFirst(
        [System.Windows.Automation.TreeScope]::Descendants,
        $condition
    )
    if ($addressBar) {{
        $pattern = $addressBar.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
        Write-Output $pattern.Current.Value
    }}
}} catch {{}}"#,
        process_name
    );

    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", &script])
        .output()
        .ok()?;

    if output.status.success() {
        let url = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !url.is_empty() {
            Some(normalize_url(&url))
        } else {
            None
        }
    } else {
        None
    }
}

pub fn get_browser_context(app_name: &str) -> BrowserContext {
    let browser = match match_browser(app_name) {
        Some(b) => b,
        None => return BrowserContext::default(),
    };

    #[cfg(target_os = "macos")]
    let raw_url = extract_url_macos(&browser);

    #[cfg(target_os = "windows")]
    let raw_url = extract_url_windows(&browser);

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let raw_url: Option<String> = None;

    match raw_url {
        Some(url) => {
            let normalized = normalize_url(&url);
            let domain = extract_domain(&normalized);
            debug!(
                "Extracted browser context - browser: {}, url: {}, domain: {:?}",
                browser, normalized, domain
            );
            BrowserContext {
                url: Some(normalized),
                domain,
                browser: Some(browser),
            }
        }
        None => {
            debug!(
                "Browser detected ({}) but could not extract URL",
                browser
            );
            BrowserContext {
                url: None,
                domain: None,
                browser: Some(browser),
            }
        }
    }
}
