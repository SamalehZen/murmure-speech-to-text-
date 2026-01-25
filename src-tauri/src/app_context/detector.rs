use super::types::ActiveWindowInfo;

pub fn get_active_window() -> Result<ActiveWindowInfo, String> {
    #[cfg(target_os = "windows")]
    {
        super::windows::get_active_window()
    }

    #[cfg(target_os = "linux")]
    {
        super::linux::get_active_window()
    }

    #[cfg(target_os = "macos")]
    {
        super::macos::get_active_window()
    }

    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    {
        Err("Platform not supported".to_string())
    }
}
