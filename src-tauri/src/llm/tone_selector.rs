use crate::context::BrowserContext;
use crate::llm::types::{AppMatcher, Tone, TonesSettings};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ToneSelectionResult {
    pub tone: Tone,
    pub matched_by: MatchedBy,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type", content = "value")]
pub enum MatchedBy {
    ManualOverride,
    Domain(String),
    App(String),
    Default,
}

pub fn select_tone(
    settings: &TonesSettings,
    app_name: &str,
    browser_context: &Option<BrowserContext>,
) -> Option<ToneSelectionResult> {
    if let Some(override_id) = &settings.manual_override_tone_id {
        if let Some(tone) = settings.tones.iter().find(|t| &t.id == override_id) {
            return Some(ToneSelectionResult {
                tone: tone.clone(),
                matched_by: MatchedBy::ManualOverride,
            });
        }
    }

    if let Some(ctx) = browser_context {
        if let Some(domain) = &ctx.domain {
            for reg in &settings.registered_apps {
                if let AppMatcher::Domain { pattern } = &reg.matcher {
                    if domain_matches(domain, pattern) {
                        if let Some(tone) = settings.tones.iter().find(|t| t.id == reg.tone_id) {
                            return Some(ToneSelectionResult {
                                tone: tone.clone(),
                                matched_by: MatchedBy::Domain(domain.clone()),
                            });
                        }
                    }
                }
            }
        }
    }

    for reg in &settings.registered_apps {
        if let AppMatcher::App {
            app_name: registered_name,
            process_name,
        } = &reg.matcher
        {
            let app_lower = app_name.to_lowercase();
            let matches = app_lower.contains(&registered_name.to_lowercase())
                || process_name
                    .as_ref()
                    .map(|p| app_lower.contains(&p.to_lowercase()))
                    .unwrap_or(false);

            if matches {
                if let Some(tone) = settings.tones.iter().find(|t| t.id == reg.tone_id) {
                    return Some(ToneSelectionResult {
                        tone: tone.clone(),
                        matched_by: MatchedBy::App(app_name.to_string()),
                    });
                }
            }
        }
    }

    if let Some(default_id) = &settings.default_tone_id {
        if let Some(tone) = settings.tones.iter().find(|t| &t.id == default_id) {
            return Some(ToneSelectionResult {
                tone: tone.clone(),
                matched_by: MatchedBy::Default,
            });
        }
    }

    None
}

fn domain_matches(domain: &str, pattern: &str) -> bool {
    let domain = domain.to_lowercase();
    let pattern = pattern.to_lowercase();

    if pattern.starts_with("*.") {
        let suffix = &pattern[1..];
        domain.ends_with(suffix) || domain == &pattern[2..]
    } else {
        domain == pattern
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_domain_matches_exact() {
        assert!(domain_matches("mail.google.com", "mail.google.com"));
        assert!(domain_matches("MAIL.GOOGLE.COM", "mail.google.com"));
        assert!(!domain_matches("mail.google.com", "google.com"));
    }

    #[test]
    fn test_domain_matches_wildcard() {
        assert!(domain_matches("foo.github.com", "*.github.com"));
        assert!(domain_matches("bar.github.com", "*.github.com"));
        assert!(domain_matches("github.com", "*.github.com"));
        assert!(!domain_matches("notgithub.com", "*.github.com"));
    }
}
