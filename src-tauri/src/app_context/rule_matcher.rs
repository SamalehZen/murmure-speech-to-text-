use crate::app_context::ActiveWindowInfo;
use crate::llm::types::{AppMatchType, AppPromptRule};
use log::debug;
use once_cell::sync::Lazy;
use parking_lot::Mutex;
use regex::Regex;
use std::collections::HashMap;
use std::time::{Duration, Instant};

static REGEX_CACHE: Lazy<Mutex<HashMap<String, Regex>>> = Lazy::new(|| Mutex::new(HashMap::new()));

static WINDOW_CACHE: Lazy<Mutex<Option<(ActiveWindowInfo, Instant)>>> =
    Lazy::new(|| Mutex::new(None));

const CACHE_TTL_MS: u64 = 100;

pub fn get_cached_active_window() -> Result<ActiveWindowInfo, String> {
    let mut cache = WINDOW_CACHE.lock();

    if let Some((ref info, timestamp)) = *cache {
        if timestamp.elapsed() < Duration::from_millis(CACHE_TTL_MS) {
            return Ok(info.clone());
        }
    }

    let info = crate::app_context::get_active_window()?;
    *cache = Some((info.clone(), Instant::now()));
    Ok(info)
}

pub fn invalidate_window_cache() {
    let mut cache = WINDOW_CACHE.lock();
    *cache = None;
}

pub fn rule_matches(window: &ActiveWindowInfo, rule: &AppPromptRule) -> bool {
    match rule.match_type {
        AppMatchType::AppNameContains => window
            .app_name
            .to_lowercase()
            .contains(&rule.match_pattern.to_lowercase()),

        AppMatchType::WindowTitleContains => window
            .window_title
            .to_lowercase()
            .contains(&rule.match_pattern.to_lowercase()),

        AppMatchType::ProcessNameEquals => {
            window.process_name.to_lowercase() == rule.match_pattern.to_lowercase()
        }

        AppMatchType::WindowTitleRegex => get_or_compile_regex(&rule.match_pattern)
            .map(|r| r.is_match(&window.window_title))
            .unwrap_or(false),

        AppMatchType::BrowserUrlContains => window
            .browser_url
            .as_ref()
            .map(|url| url.to_lowercase().contains(&rule.match_pattern.to_lowercase()))
            .unwrap_or(false),

        AppMatchType::ProcessPathContains => window
            .process_path
            .to_lowercase()
            .contains(&rule.match_pattern.to_lowercase()),

        AppMatchType::WindowClassEquals => {
            window.window_class.to_lowercase() == rule.match_pattern.to_lowercase()
        }
    }
}

fn get_or_compile_regex(pattern: &str) -> Option<Regex> {
    let mut cache = REGEX_CACHE.lock();

    if let Some(regex) = cache.get(pattern) {
        return Some(regex.clone());
    }

    match Regex::new(pattern) {
        Ok(regex) => {
            cache.insert(pattern.to_string(), regex.clone());
            Some(regex)
        }
        Err(e) => {
            debug!("Failed to compile regex '{}': {}", pattern, e);
            None
        }
    }
}

pub fn get_rule_specificity(rule: &AppPromptRule, window: &ActiveWindowInfo) -> i32 {
    let base_score = match rule.match_type {
        AppMatchType::ProcessNameEquals => 1000,
        AppMatchType::WindowClassEquals => 900,
        AppMatchType::BrowserUrlContains => 850,
        AppMatchType::ProcessPathContains => 800,
        AppMatchType::WindowTitleRegex => 700,
        AppMatchType::WindowTitleContains => 500,
        AppMatchType::AppNameContains => 200,
    };

    let pattern_len_bonus = (rule.match_pattern.len() as i32).min(100);

    let exact_match_bonus = if is_exact_match(window, rule) { 50 } else { 0 };

    base_score + pattern_len_bonus + exact_match_bonus
}

fn is_exact_match(window: &ActiveWindowInfo, rule: &AppPromptRule) -> bool {
    let pattern_lower = rule.match_pattern.to_lowercase();

    match rule.match_type {
        AppMatchType::WindowTitleContains => {
            window.window_title.to_lowercase() == pattern_lower
        }
        AppMatchType::AppNameContains => {
            window.app_name.to_lowercase() == pattern_lower
        }
        AppMatchType::BrowserUrlContains => window
            .browser_url
            .as_ref()
            .map(|url| url.to_lowercase() == pattern_lower)
            .unwrap_or(false),
        _ => false,
    }
}

pub fn find_best_matching_rule<'a>(
    rules: &'a [AppPromptRule],
    window: &ActiveWindowInfo,
) -> Option<&'a AppPromptRule> {
    let mut matching_rules: Vec<_> = rules
        .iter()
        .filter(|r| r.enabled && rule_matches(window, r))
        .collect();

    if matching_rules.is_empty() {
        return None;
    }

    matching_rules.sort_by(|a, b| {
        let spec_a = get_rule_specificity(a, window);
        let spec_b = get_rule_specificity(b, window);

        match spec_b.cmp(&spec_a) {
            std::cmp::Ordering::Equal => b.priority.cmp(&a.priority),
            other => other,
        }
    });

    matching_rules.first().copied()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_window() -> ActiveWindowInfo {
        ActiveWindowInfo {
            app_name: "chrome".to_string(),
            window_title: "ChatGPT - Google Chrome".to_string(),
            process_name: "chrome.exe".to_string(),
            process_path: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe".to_string(),
            window_class: "Chrome_WidgetWin_1".to_string(),
            browser_url: Some("chatgpt.com".to_string()),
        }
    }

    fn create_test_rule(match_type: AppMatchType, pattern: &str, priority: i32) -> AppPromptRule {
        AppPromptRule {
            id: "test".to_string(),
            name: "Test Rule".to_string(),
            match_type,
            match_pattern: pattern.to_string(),
            prompt_template: "test prompt".to_string(),
            priority,
            enabled: true,
        }
    }

    #[test]
    fn test_browser_url_match() {
        let window = create_test_window();
        let rule = create_test_rule(AppMatchType::BrowserUrlContains, "chatgpt", 50);
        assert!(rule_matches(&window, &rule));
    }

    #[test]
    fn test_specificity_order() {
        let window = create_test_window();

        let url_rule = create_test_rule(AppMatchType::BrowserUrlContains, "chatgpt.com", 50);
        let title_rule = create_test_rule(AppMatchType::WindowTitleContains, "ChatGPT", 50);
        let app_rule = create_test_rule(AppMatchType::AppNameContains, "chrome", 50);

        let url_spec = get_rule_specificity(&url_rule, &window);
        let title_spec = get_rule_specificity(&title_rule, &window);
        let app_spec = get_rule_specificity(&app_rule, &window);

        assert!(url_spec > title_spec);
        assert!(title_spec > app_spec);
    }
}
