use super::types::ActiveWindowInfo;
use std::ffi::OsString;
use std::os::windows::ffi::OsStringExt;
use windows_sys::Win32::Foundation::{CloseHandle, MAX_PATH};
use windows_sys::Win32::System::Threading::{
    OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION,
};
use windows_sys::Win32::UI::WindowsAndMessaging::{
    GetClassNameW, GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId,
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

        let mut class_buf: [u16; 256] = [0; 256];
        let class_len = GetClassNameW(hwnd, class_buf.as_mut_ptr(), class_buf.len() as i32);
        let window_class = if class_len > 0 {
            OsString::from_wide(&class_buf[..class_len as usize])
                .to_string_lossy()
                .to_string()
        } else {
            String::new()
        };

        let mut process_id: u32 = 0;
        GetWindowThreadProcessId(hwnd, &mut process_id);

        let (app_name, process_name, process_path) = if process_id != 0 {
            let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, process_id);
            if !handle.is_null() {
                let mut path_buf: [u16; MAX_PATH as usize] = [0; MAX_PATH as usize];
                let mut path_len = MAX_PATH;
                if QueryFullProcessImageNameW(handle, 0, path_buf.as_mut_ptr(), &mut path_len) != 0
                {
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

                    (app_name, process_name, path)
                } else {
                    let _ = CloseHandle(handle);
                    (String::new(), String::new(), String::new())
                }
            } else {
                (String::new(), String::new(), String::new())
            }
        } else {
            (String::new(), String::new(), String::new())
        };

        let mut info = ActiveWindowInfo {
            app_name,
            window_title,
            process_name,
            process_path,
            window_class,
            browser_url: None,
        };

        info.extract_browser_url();

        Ok(info)
    }
}
