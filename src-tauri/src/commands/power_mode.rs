use crate::app_context;
use crate::power_mode::{
    self, InstalledApp, OriginalLLMState, PowerModeConfig, PowerModeMatcher, PowerModeSettings,
    TriggerRule,
};
use tauri::{command, AppHandle, Emitter};

#[command]
pub fn get_power_mode_settings(app: AppHandle) -> Result<PowerModeSettings, String> {
    power_mode::load(&app)
}

#[command]
pub fn save_power_mode_settings(app: AppHandle, settings: PowerModeSettings) -> Result<(), String> {
    power_mode::save(&app, &settings)?;
    let _ = app.emit("power-mode-settings-updated", &settings);
    Ok(())
}

#[command]
pub fn get_power_modes(app: AppHandle) -> Result<Vec<PowerModeConfig>, String> {
    let settings = power_mode::load(&app)?;
    Ok(settings.power_modes)
}

#[command]
pub fn save_power_mode(app: AppHandle, config: PowerModeConfig) -> Result<(), String> {
    let mut settings = power_mode::load(&app)?;

    if let Some(pos) = settings
        .power_modes
        .iter()
        .position(|pm| pm.id == config.id)
    {
        settings.power_modes[pos] = config;
    } else {
        settings.power_modes.push(config);
    }

    power_mode::save(&app, &settings)?;
    let _ = app.emit("power-mode-settings-updated", &settings);
    Ok(())
}

#[command]
pub fn delete_power_mode(app: AppHandle, id: String) -> Result<(), String> {
    let mut settings = power_mode::load(&app)?;
    settings.power_modes.retain(|pm| pm.id != id);
    power_mode::save(&app, &settings)?;
    let _ = app.emit("power-mode-settings-updated", &settings);
    Ok(())
}

#[command]
pub fn toggle_power_mode_enabled(app: AppHandle, enabled: bool) -> Result<(), String> {
    let mut settings = power_mode::load(&app)?;
    settings.is_power_mode_enabled = enabled;
    power_mode::save(&app, &settings)?;
    let _ = app.emit("power-mode-settings-updated", &settings);

    if !enabled {
        power_mode::clear_session();
        let _ = app.emit("power-mode-deactivated", ());
    }

    Ok(())
}

#[command]
pub fn get_installed_apps() -> Result<Vec<InstalledApp>, String> {
    #[cfg(target_os = "windows")]
    {
        get_installed_apps_windows()
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(Vec::new())
    }
}

#[cfg(target_os = "windows")]
fn get_installed_apps_windows() -> Result<Vec<InstalledApp>, String> {
    use std::collections::HashSet;

    let mut apps: Vec<InstalledApp> = Vec::new();
    let mut seen_executables: HashSet<String> = HashSet::new();

    let paths = [
        std::env::var("ProgramFiles").ok(),
        std::env::var("ProgramFiles(x86)").ok(),
        std::env::var("LOCALAPPDATA").ok(),
    ];

    for base_path in paths.iter().flatten() {
        if let Ok(entries) = std::fs::read_dir(base_path) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    if let Some(app) = find_exe_in_dir(&path, &mut seen_executables) {
                        apps.push(app);
                    }
                }
            }
        }
    }

    let common_apps = [
        ("chrome.exe", "Google Chrome"),
        ("msedge.exe", "Microsoft Edge"),
        ("firefox.exe", "Mozilla Firefox"),
        ("code.exe", "Visual Studio Code"),
        ("slack.exe", "Slack"),
        ("discord.exe", "Discord"),
        ("Teams.exe", "Microsoft Teams"),
        ("notion.exe", "Notion"),
        ("Spotify.exe", "Spotify"),
        ("brave.exe", "Brave Browser"),
    ];

    for (exe, name) in common_apps {
        let exe_lower = exe.to_lowercase();
        if !seen_executables.contains(&exe_lower) {
            apps.push(InstalledApp {
                name: name.to_string(),
                executable_path: String::new(),
                executable_name: exe.to_string(),
            });
            seen_executables.insert(exe_lower);
        }
    }

    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(apps)
}

#[cfg(target_os = "windows")]
fn find_exe_in_dir(
    dir: &std::path::Path,
    seen: &mut std::collections::HashSet<String>,
) -> Option<InstalledApp> {
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension() {
                    if ext.eq_ignore_ascii_case("exe") {
                        let exe_name = path
                            .file_name()
                            .map(|n| n.to_string_lossy().to_string())
                            .unwrap_or_default();

                        let exe_lower = exe_name.to_lowercase();
                        if !seen.contains(&exe_lower) && !exe_lower.contains("uninstall") {
                            seen.insert(exe_lower);

                            let app_name = dir
                                .file_name()
                                .map(|n| n.to_string_lossy().to_string())
                                .unwrap_or_else(|| exe_name.trim_end_matches(".exe").to_string());

                            return Some(InstalledApp {
                                name: app_name,
                                executable_path: path.to_string_lossy().to_string(),
                                executable_name: exe_name,
                            });
                        }
                    }
                }
            }
        }
    }
    None
}

#[command]
pub fn get_active_power_mode(app: AppHandle) -> Result<Option<PowerModeConfig>, String> {
    let active_id = power_mode::get_active_power_mode_id();

    match active_id {
        Some(id) => {
            let settings = power_mode::load(&app)?;
            Ok(settings.power_modes.into_iter().find(|pm| pm.id == id))
        }
        None => Ok(None),
    }
}

#[command]
pub fn check_power_mode_trigger(app: AppHandle) -> Result<Option<String>, String> {
    let settings = power_mode::load(&app)?;

    if !settings.is_power_mode_enabled {
        return Ok(None);
    }

    let window_info = app_context::get_active_window()?;
    let browser_url = power_mode::get_browser_url_if_active(&window_info.process_name);

    let matched = PowerModeMatcher::find_matching_power_mode(
        &window_info,
        browser_url.as_deref(),
        &settings.power_modes,
    );

    let current_active = power_mode::get_active_power_mode_id();

    match matched {
        Some(power_mode) => {
            if current_active.as_ref() != Some(&power_mode.id) {
                let _ = app.emit(
                    "power-mode-activated",
                    serde_json::json!({
                        "power_mode_id": power_mode.id,
                        "power_mode_name": power_mode.name,
                    }),
                );
            }
            Ok(Some(power_mode.id.clone()))
        }
        None => {
            if current_active.is_some() {
                let _ = app.emit("power-mode-deactivated", ());
            }
            Ok(None)
        }
    }
}

#[command]
pub fn set_power_mode_session(
    power_mode_id: Option<String>,
    original_state: Option<OriginalLLMState>,
) {
    power_mode::set_active_power_mode(power_mode_id, original_state);
}

#[command]
pub fn get_power_mode_session() -> power_mode::PowerModeSession {
    power_mode::get_session()
}

#[command]
pub fn clear_power_mode_session() {
    power_mode::clear_session();
}

#[command]
pub fn test_power_mode_trigger(trigger: TriggerRule) -> Result<bool, String> {
    let window_info = crate::app_context::get_active_window()?;
    let browser_url = power_mode::get_browser_url_if_active(&window_info.process_name);

    Ok(PowerModeMatcher::trigger_matches(
        &trigger,
        &window_info,
        browser_url.as_deref(),
    ))
}
