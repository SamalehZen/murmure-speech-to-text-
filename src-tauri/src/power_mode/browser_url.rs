#[cfg(target_os = "windows")]
use std::ffi::OsString;
#[cfg(target_os = "windows")]
use std::os::windows::ffi::OsStringExt;

#[allow(dead_code)]
const BROWSER_PROCESSES: &[(&str, &str)] = &[
    ("chrome.exe", "Chrome"),
    ("msedge.exe", "Edge"),
    ("firefox.exe", "Firefox"),
    ("brave.exe", "Brave"),
    ("opera.exe", "Opera"),
    ("vivaldi.exe", "Vivaldi"),
    ("chromium.exe", "Chromium"),
];

#[allow(dead_code)]
pub fn is_browser_process(process_name: &str) -> bool {
    let process_lower = process_name.to_lowercase();
    BROWSER_PROCESSES
        .iter()
        .any(|(name, _)| process_lower == *name)
}

#[cfg(target_os = "windows")]
pub fn get_browser_url_if_active(process_name: &str) -> Option<String> {
    use windows_sys::Win32::UI::WindowsAndMessaging::GetForegroundWindow;

    if !is_browser_process(process_name) {
        return None;
    }

    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.is_null() {
            return None;
        }

        get_browser_url_from_window(hwnd, process_name)
    }
}

#[cfg(target_os = "windows")]
unsafe fn get_browser_url_from_window(
    hwnd: windows_sys::Win32::Foundation::HWND,
    process_name: &str,
) -> Option<String> {
    use windows_sys::Win32::UI::WindowsAndMessaging::{GetWindowTextLengthW, GetWindowTextW};

    let title_len = GetWindowTextLengthW(hwnd);
    if title_len == 0 {
        return None;
    }

    let mut title_buf: Vec<u16> = vec![0; (title_len + 1) as usize];
    let actual_len = GetWindowTextW(hwnd, title_buf.as_mut_ptr(), title_buf.len() as i32);

    if actual_len <= 0 {
        return None;
    }

    let title = OsString::from_wide(&title_buf[..actual_len as usize])
        .to_string_lossy()
        .to_string();

    extract_url_from_title(&title, process_name)
}

#[cfg(target_os = "windows")]
fn extract_url_from_title(title: &str, process_name: &str) -> Option<String> {
    let process_lower = process_name.to_lowercase();

    let browser_suffix = match process_lower.as_str() {
        "chrome.exe" => " - Google Chrome",
        "msedge.exe" => " - Microsoft Edge",
        "firefox.exe" => " — Mozilla Firefox",
        "brave.exe" => " - Brave",
        "opera.exe" => " - Opera",
        "vivaldi.exe" => " - Vivaldi",
        _ => return None,
    };

    if let Some(idx) = title.find(browser_suffix) {
        let page_title = &title[..idx];

        if page_title.contains("://") {
            return Some(page_title.to_string());
        }

        for part in page_title.split(" - ").rev() {
            let trimmed = part.trim();
            if trimmed.contains('.') && !trimmed.contains(' ') {
                if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
                    return Some(trimmed.to_string());
                }
                return Some(format!("https://{}", trimmed));
            }
        }
    }

    None
}

#[cfg(not(target_os = "windows"))]
pub fn get_browser_url_if_active(_process_name: &str) -> Option<String> {
    None
}
