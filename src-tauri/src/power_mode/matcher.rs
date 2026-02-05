use super::types::PowerModeConfig;
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
            .filter(|pm| pm.is_enabled && Self::matches(pm, window_info, browser_url))
            .collect();

        matches.sort_by(|a, b| b.priority.cmp(&a.priority));
        matches.first().copied()
    }

    fn matches(
        power_mode: &PowerModeConfig,
        window_info: &ActiveWindowInfo,
        browser_url: Option<&str>,
    ) -> bool {
        for trigger in &power_mode.app_triggers {
            if window_info
                .process_name
                .eq_ignore_ascii_case(&trigger.executable_name)
            {
                return true;
            }
        }

        if let Some(url) = browser_url {
            for trigger in &power_mode.url_triggers {
                if Self::url_matches(url, &trigger.pattern) {
                    return true;
                }
            }
        }

        false
    }

    fn url_matches(url: &str, pattern: &str) -> bool {
        let url_lower = url.to_lowercase();
        let pattern_lower = pattern.to_lowercase();

        let domain = Self::extract_domain(&url_lower);

        if pattern_lower.starts_with("*.") {
            let suffix = &pattern_lower[2..];
            domain.ends_with(&suffix) || domain == suffix.trim_start_matches('.')
        } else {
            domain == pattern_lower || domain.ends_with(&format!(".{}", pattern_lower))
        }
    }

    fn extract_domain(url: &str) -> String {
        let without_protocol = url
            .trim_start_matches("https://")
            .trim_start_matches("http://");

        without_protocol
            .split('/')
            .next()
            .unwrap_or("")
            .split(':')
            .next()
            .unwrap_or("")
            .to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_url_matching_exact() {
        assert!(PowerModeMatcher::url_matches(
            "https://github.com/user/repo",
            "github.com"
        ));
    }

    #[test]
    fn test_url_matching_wildcard() {
        assert!(PowerModeMatcher::url_matches(
            "https://docs.google.com/document",
            "*.google.com"
        ));
    }

    #[test]
    fn test_url_matching_subdomain() {
        assert!(PowerModeMatcher::url_matches(
            "https://mail.google.com",
            "google.com"
        ));
    }

    #[test]
    fn test_extract_domain() {
        assert_eq!(
            PowerModeMatcher::extract_domain("https://github.com/user/repo"),
            "github.com"
        );
        assert_eq!(
            PowerModeMatcher::extract_domain("http://localhost:3000/path"),
            "localhost"
        );
    }
}
