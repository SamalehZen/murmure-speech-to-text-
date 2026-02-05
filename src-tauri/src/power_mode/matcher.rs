use regex::Regex;

use super::types::{PowerModeConfig, TriggerMatchType, TriggerRule};
use crate::app_context::ActiveWindowInfo;

pub struct PowerModeMatcher;

impl PowerModeMatcher {
    pub fn find_matching_power_mode<'a>(
        window_info: &ActiveWindowInfo,
        browser_url: Option<&str>,
        power_modes: &'a [PowerModeConfig],
    ) -> Option<&'a PowerModeConfig> {
        let mut matches: Vec<_> = power_modes
            .iter()
            .filter(|pm| pm.is_enabled && Self::has_matching_trigger(pm, window_info, browser_url))
            .collect();

        matches.sort_by(|a, b| b.priority.cmp(&a.priority));
        matches.first().copied()
    }

    fn has_matching_trigger(
        power_mode: &PowerModeConfig,
        window_info: &ActiveWindowInfo,
        browser_url: Option<&str>,
    ) -> bool {
        power_mode.triggers.iter().any(|trigger| {
            trigger.enabled && Self::trigger_matches(trigger, window_info, browser_url)
        })
    }

    pub fn trigger_matches(
        trigger: &TriggerRule,
        window_info: &ActiveWindowInfo,
        browser_url: Option<&str>,
    ) -> bool {
        match trigger.match_type {
            TriggerMatchType::AppNameContains => window_info
                .app_name
                .to_lowercase()
                .contains(&trigger.pattern.to_lowercase()),
            TriggerMatchType::WindowTitleContains => window_info
                .window_title
                .to_lowercase()
                .contains(&trigger.pattern.to_lowercase()),
            TriggerMatchType::ProcessNameEquals => {
                window_info.process_name.to_lowercase() == trigger.pattern.to_lowercase()
            }
            TriggerMatchType::WindowTitleRegex => Regex::new(&trigger.pattern)
                .map(|r| r.is_match(&window_info.window_title))
                .unwrap_or(false),
            TriggerMatchType::UrlContains => browser_url
                .map(|url| url.to_lowercase().contains(&trigger.pattern.to_lowercase()))
                .unwrap_or(false),
            TriggerMatchType::UrlRegex => browser_url
                .and_then(|url| Regex::new(&trigger.pattern).map(|r| r.is_match(url)).ok())
                .unwrap_or(false),
            TriggerMatchType::UrlDomainEquals => browser_url
                .map(|url| {
                    Self::extract_domain(url)
                        .map(|d| d.to_lowercase() == trigger.pattern.to_lowercase())
                        .unwrap_or(false)
                })
                .unwrap_or(false),
        }
    }

    fn extract_domain(url: &str) -> Option<&str> {
        let url = url
            .strip_prefix("https://")
            .or_else(|| url.strip_prefix("http://"))?;
        url.split('/').next()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_window_info(
        app_name: &str,
        window_title: &str,
        process_name: &str,
    ) -> ActiveWindowInfo {
        ActiveWindowInfo {
            app_name: app_name.to_string(),
            window_title: window_title.to_string(),
            process_name: process_name.to_string(),
        }
    }

    fn create_trigger(match_type: TriggerMatchType, pattern: &str) -> TriggerRule {
        TriggerRule {
            id: "test".to_string(),
            name: "Test Trigger".to_string(),
            match_type,
            pattern: pattern.to_string(),
            enabled: true,
        }
    }

    #[test]
    fn test_app_name_contains() {
        let window_info = create_window_info("Visual Studio Code", "main.rs - project", "code.exe");
        let trigger = create_trigger(TriggerMatchType::AppNameContains, "studio code");
        assert!(PowerModeMatcher::trigger_matches(
            &trigger,
            &window_info,
            None
        ));
    }

    #[test]
    fn test_app_name_contains_case_insensitive() {
        let window_info = create_window_info("Visual Studio Code", "main.rs - project", "code.exe");
        let trigger = create_trigger(TriggerMatchType::AppNameContains, "STUDIO CODE");
        assert!(PowerModeMatcher::trigger_matches(
            &trigger,
            &window_info,
            None
        ));
    }

    #[test]
    fn test_window_title_contains() {
        let window_info = create_window_info("Code", "README.md - my-project", "code.exe");
        let trigger = create_trigger(TriggerMatchType::WindowTitleContains, "my-project");
        assert!(PowerModeMatcher::trigger_matches(
            &trigger,
            &window_info,
            None
        ));
    }

    #[test]
    fn test_process_name_equals() {
        let window_info = create_window_info("VS Code", "file.rs", "Code.exe");
        let trigger = create_trigger(TriggerMatchType::ProcessNameEquals, "code.exe");
        assert!(PowerModeMatcher::trigger_matches(
            &trigger,
            &window_info,
            None
        ));
    }

    #[test]
    fn test_process_name_equals_no_match() {
        let window_info = create_window_info("VS Code", "file.rs", "code.exe");
        let trigger = create_trigger(TriggerMatchType::ProcessNameEquals, "code");
        assert!(!PowerModeMatcher::trigger_matches(
            &trigger,
            &window_info,
            None
        ));
    }

    #[test]
    fn test_window_title_regex() {
        let window_info = create_window_info("Code", "main.rs - my-project [Git]", "code.exe");
        let trigger = create_trigger(TriggerMatchType::WindowTitleRegex, r"\.rs.*\[Git\]");
        assert!(PowerModeMatcher::trigger_matches(
            &trigger,
            &window_info,
            None
        ));
    }

    #[test]
    fn test_window_title_regex_invalid_pattern() {
        let window_info = create_window_info("Code", "main.rs", "code.exe");
        let trigger = create_trigger(TriggerMatchType::WindowTitleRegex, r"[invalid");
        assert!(!PowerModeMatcher::trigger_matches(
            &trigger,
            &window_info,
            None
        ));
    }

    #[test]
    fn test_url_contains() {
        let window_info = create_window_info("Chrome", "GitHub", "chrome.exe");
        let trigger = create_trigger(TriggerMatchType::UrlContains, "github.com");
        assert!(PowerModeMatcher::trigger_matches(
            &trigger,
            &window_info,
            Some("https://github.com/user/repo")
        ));
    }

    #[test]
    fn test_url_contains_no_url() {
        let window_info = create_window_info("Notepad", "file.txt", "notepad.exe");
        let trigger = create_trigger(TriggerMatchType::UrlContains, "github.com");
        assert!(!PowerModeMatcher::trigger_matches(
            &trigger,
            &window_info,
            None
        ));
    }

    #[test]
    fn test_url_regex() {
        let window_info = create_window_info("Chrome", "Pull Request", "chrome.exe");
        let trigger = create_trigger(TriggerMatchType::UrlRegex, r"github\.com/.+/pull/\d+");
        assert!(PowerModeMatcher::trigger_matches(
            &trigger,
            &window_info,
            Some("https://github.com/user/repo/pull/123")
        ));
    }

    #[test]
    fn test_url_domain_equals() {
        let window_info = create_window_info("Chrome", "GitHub", "chrome.exe");
        let trigger = create_trigger(TriggerMatchType::UrlDomainEquals, "github.com");
        assert!(PowerModeMatcher::trigger_matches(
            &trigger,
            &window_info,
            Some("https://github.com/user/repo")
        ));
    }

    #[test]
    fn test_url_domain_equals_subdomain() {
        let window_info = create_window_info("Chrome", "Docs", "chrome.exe");
        let trigger = create_trigger(TriggerMatchType::UrlDomainEquals, "docs.google.com");
        assert!(PowerModeMatcher::trigger_matches(
            &trigger,
            &window_info,
            Some("https://docs.google.com/document/d/123")
        ));
    }

    #[test]
    fn test_url_domain_equals_no_match() {
        let window_info = create_window_info("Chrome", "Google", "chrome.exe");
        let trigger = create_trigger(TriggerMatchType::UrlDomainEquals, "google.com");
        assert!(!PowerModeMatcher::trigger_matches(
            &trigger,
            &window_info,
            Some("https://docs.google.com/document")
        ));
    }

    #[test]
    fn test_extract_domain() {
        assert_eq!(
            PowerModeMatcher::extract_domain("https://github.com/user/repo"),
            Some("github.com")
        );
        assert_eq!(
            PowerModeMatcher::extract_domain("http://localhost:3000/path"),
            Some("localhost:3000")
        );
        assert_eq!(PowerModeMatcher::extract_domain("invalid-url"), None);
    }

    #[test]
    fn test_disabled_trigger_not_matched() {
        let window_info = create_window_info("VS Code", "file.rs", "code.exe");
        let mut trigger = create_trigger(TriggerMatchType::ProcessNameEquals, "code.exe");
        trigger.enabled = false;

        let power_mode = PowerModeConfig {
            id: "test".to_string(),
            name: "Test".to_string(),
            emoji: "🔧".to_string(),
            is_enabled: true,
            priority: 1,
            triggers: vec![trigger],
            is_ai_enhancement_enabled: false,
            selected_ai_provider: None,
            selected_ai_model: None,
            prompt_template: String::new(),
            use_screen_capture: false,
        };

        assert!(
            PowerModeMatcher::find_matching_power_mode(&window_info, None, &[power_mode]).is_none()
        );
    }

    #[test]
    fn test_priority_ordering() {
        let window_info = create_window_info("VS Code", "file.rs", "code.exe");

        let low_priority = PowerModeConfig {
            id: "low".to_string(),
            name: "Low".to_string(),
            emoji: "1️⃣".to_string(),
            is_enabled: true,
            priority: 1,
            triggers: vec![create_trigger(
                TriggerMatchType::ProcessNameEquals,
                "code.exe",
            )],
            is_ai_enhancement_enabled: false,
            selected_ai_provider: None,
            selected_ai_model: None,
            prompt_template: String::new(),
            use_screen_capture: false,
        };

        let high_priority = PowerModeConfig {
            id: "high".to_string(),
            name: "High".to_string(),
            emoji: "🔝".to_string(),
            is_enabled: true,
            priority: 10,
            triggers: vec![create_trigger(
                TriggerMatchType::ProcessNameEquals,
                "code.exe",
            )],
            is_ai_enhancement_enabled: false,
            selected_ai_provider: None,
            selected_ai_model: None,
            prompt_template: String::new(),
            use_screen_capture: false,
        };

        let result = PowerModeMatcher::find_matching_power_mode(
            &window_info,
            None,
            &[low_priority, high_priority],
        );
        assert_eq!(result.map(|pm| pm.id.as_str()), Some("high"));
    }
}
