use super::types::ActiveWindowInfo;
use std::ffi::OsString;
use std::os::windows::ffi::OsStringExt;
use windows_sys::Win32::Foundation::{CloseHandle, MAX_PATH};
use windows_sys::Win32::System::Threading::{
    OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION,
};
use windows_sys::Win32::UI::WindowsAndMessaging::{
    GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId,
};

pub fn get_active_window() -> Result<ActiveWindowInfo, String> {
    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.is_null() {
            return Err("No foreground window".to_string());
        }

        let mut title_buf: [u16; 512] = [0; 512];
        let title_len = GetWindowTextW(hwnd, title_buf.as_mut_ptr(), title_buf.len() as i32);
        let window_title = if title_len > 0 {
            OsString::from_wide(&title_buf[..title_len as usize])
                .to_string_lossy()
                .to_string()
        } else {
            String::new()
        };

        let mut process_id: u32 = 0;
        GetWindowThreadProcessId(hwnd, &mut process_id);

        let (app_name, process_name, exe_path) = if process_id != 0 {
            get_process_info(process_id)
        } else {
            (String::new(), String::new(), None)
        };

        let url = if is_browser(&process_name) {
            get_browser_url(&process_name, hwnd)
        } else {
            None
        };

        Ok(ActiveWindowInfo {
            app_name,
            window_title,
            process_name,
            bundle_id: None,
            url,
            exe_path,
        })
    }
}

unsafe fn get_process_info(process_id: u32) -> (String, String, Option<String>) {
    let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, process_id);
    if handle.is_null() {
        return (String::new(), String::new(), None);
    }

    let mut path_buf: [u16; MAX_PATH as usize] = [0; MAX_PATH as usize];
    let mut path_len = MAX_PATH;
    
    if QueryFullProcessImageNameW(handle, 0, path_buf.as_mut_ptr(), &mut path_len) != 0 {
        let path = OsString::from_wide(&path_buf[..path_len as usize])
            .to_string_lossy()
            .to_string();
        let _ = CloseHandle(handle);
        
        let process_name = std::path::Path::new(&path)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();
        
        let app_name = process_name
            .strip_suffix(".exe")
            .unwrap_or(&process_name)
            .to_string();
        
        (app_name, process_name, Some(path))
    } else {
        let _ = CloseHandle(handle);
        (String::new(), String::new(), None)
    }
}

fn is_browser(process_name: &str) -> bool {
    let name_lower = process_name.to_lowercase();
    let browser_processes = [
        "chrome.exe", "msedge.exe", "firefox.exe", "brave.exe",
        "opera.exe", "vivaldi.exe", "iexplore.exe", "safari.exe",
        "chromium.exe", "arc.exe", "waterfox.exe", "librewolf.exe",
        "thorium.exe", "floorp.exe", "zen.exe"
    ];
    browser_processes.iter().any(|b| name_lower.contains(b) || name_lower == *b)
}

fn get_browser_url(_process_name: &str, _hwnd: *mut std::ffi::c_void) -> Option<String> {
    get_browser_url_via_uiautomation()
}

fn get_browser_url_via_uiautomation() -> Option<String> {
    use windows::Win32::UI::Accessibility::*;
    use windows::Win32::System::Com::*;
    use windows::core::*;

    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);

        let automation: IUIAutomation = match CoCreateInstance(
            &CUIAutomation,
            None,
            CLSCTX_INPROC_SERVER,
        ) {
            Ok(a) => a,
            Err(_) => return None,
        };

        let focused = match automation.GetFocusedElement() {
            Ok(f) => f,
            Err(_) => return None,
        };

        let window = match get_ancestor_window(&automation, &focused) {
            Some(w) => w,
            None => return None,
        };

        if let Some(url) = find_chromium_url(&automation, &window) {
            return Some(url);
        }

        if let Some(url) = find_firefox_url(&automation, &window) {
            return Some(url);
        }

        None
    }
}

fn get_ancestor_window(
    automation: &windows::Win32::UI::Accessibility::IUIAutomation,
    element: &windows::Win32::UI::Accessibility::IUIAutomationElement,
) -> Option<windows::Win32::UI::Accessibility::IUIAutomationElement> {
    use windows::Win32::UI::Accessibility::*;

    unsafe {
        let walker = automation.ControlViewWalker().ok()?;
        let mut current = element.clone();

        for _ in 0..30 {
            let control_type = current.CurrentControlType().ok()?;
            if control_type == UIA_WindowControlTypeId {
                return Some(current);
            }

            current = walker.GetParentElement(&current).ok()?;
        }

        None
    }
}

fn find_chromium_url(
    automation: &windows::Win32::UI::Accessibility::IUIAutomation,
    window: &windows::Win32::UI::Accessibility::IUIAutomationElement,
) -> Option<String> {
    use windows::Win32::UI::Accessibility::*;
    use windows::core::*;

    unsafe {
        let class_condition = automation
            .CreatePropertyCondition(
                UIA_ClassNamePropertyId,
                &VARIANT::from("OmniboxViewViews"),
            )
            .ok()?;

        if let Ok(address_bar) = window.FindFirst(TreeScope_Descendants, &class_condition) {
            return extract_value_from_element(&address_bar);
        }

        let edit_condition = automation
            .CreatePropertyCondition(
                UIA_ControlTypePropertyId,
                &VARIANT::from(UIA_EditControlTypeId.0 as i32),
            )
            .ok()?;

        let all_edits = window
            .FindAll(TreeScope_Descendants, &edit_condition)
            .ok()?;

        let count = all_edits.Length().ok()?;
        for i in 0..count {
            if let Ok(element) = all_edits.GetElement(i) {
                if let Ok(name) = element.CurrentName() {
                    let name_str = name.to_string().to_lowercase();
                    if name_str.contains("address") || name_str.contains("url") 
                       || name_str.contains("search") || name_str.contains("adresse") {
                        if let Some(url) = extract_value_from_element(&element) {
                            if url.starts_with("http") || url.contains(".com") || url.contains(".org") {
                                return Some(url);
                            }
                        }
                    }
                }
            }
        }

        None
    }
}

fn find_firefox_url(
    automation: &windows::Win32::UI::Accessibility::IUIAutomation,
    window: &windows::Win32::UI::Accessibility::IUIAutomationElement,
) -> Option<String> {
    use windows::Win32::UI::Accessibility::*;
    use windows::core::*;

    unsafe {
        let id_condition = automation
            .CreatePropertyCondition(
                UIA_AutomationIdPropertyId,
                &VARIANT::from("urlbar-input"),
            )
            .ok()?;

        if let Ok(urlbar) = window.FindFirst(TreeScope_Descendants, &id_condition) {
            return extract_value_from_element(&urlbar);
        }

        let combo_condition = automation
            .CreatePropertyCondition(
                UIA_ControlTypePropertyId,
                &VARIANT::from(UIA_ComboBoxControlTypeId.0 as i32),
            )
            .ok()?;

        let combos = window
            .FindAll(TreeScope_Descendants, &combo_condition)
            .ok()?;

        let count = combos.Length().ok()?;
        for i in 0..count {
            if let Ok(element) = combos.GetElement(i) {
                if let Ok(name) = element.CurrentName() {
                    let name_str = name.to_string().to_lowercase();
                    if name_str.contains("url") || name_str.contains("address") {
                        if let Some(url) = extract_value_from_element(&element) {
                            if url.starts_with("http") {
                                return Some(url);
                            }
                        }
                    }
                }
            }
        }

        None
    }
}

fn extract_value_from_element(
    element: &windows::Win32::UI::Accessibility::IUIAutomationElement,
) -> Option<String> {
    use windows::Win32::UI::Accessibility::*;
    use windows::core::Interface;

    unsafe {
        let pattern = element
            .GetCurrentPattern(UIA_ValuePatternId)
            .ok()?;

        let value_pattern: IUIAutomationValuePattern = pattern.cast().ok()?;
        let value = value_pattern.CurrentValue().ok()?;
        let url = value.to_string();

        if !url.is_empty() {
            Some(url)
        } else {
            None
        }
    }
}
