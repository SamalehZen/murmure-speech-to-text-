use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveWindowInfo {
    pub app_name: String,
    pub window_title: String,
    pub process_name: String,
    #[serde(default)]
    pub process_path: String,
    #[serde(default)]
    pub window_class: String,
    #[serde(default)]
    pub browser_url: Option<String>,
}

impl Default for ActiveWindowInfo {
    fn default() -> Self {
        Self {
            app_name: String::new(),
            window_title: String::new(),
            process_name: String::new(),
            process_path: String::new(),
            window_class: String::new(),
            browser_url: None,
        }
    }
}

impl ActiveWindowInfo {
    pub fn extract_browser_url(&mut self) {
        let browsers = ["chrome", "firefox", "msedge", "brave", "opera", "vivaldi", "arc"];
        let app_lower = self.app_name.to_lowercase();
        
        if !browsers.iter().any(|b| app_lower.contains(b)) {
            return;
        }

        let title = &self.window_title;
        
        if let Some(url) = extract_url_from_title(title) {
            self.browser_url = Some(url);
        } else if let Some(domain) = extract_domain_from_title(title) {
            self.browser_url = Some(domain);
        }
    }

    pub fn is_browser(&self) -> bool {
        let browsers = ["chrome", "firefox", "msedge", "brave", "opera", "vivaldi", "arc", "safari"];
        let app_lower = self.app_name.to_lowercase();
        browsers.iter().any(|b| app_lower.contains(b))
    }
}

fn extract_url_from_title(title: &str) -> Option<String> {
    let url_patterns = [
        r"https?://[^\s\-–—|]+",
        r"www\.[^\s\-–—|]+",
    ];
    
    for pattern in url_patterns {
        if let Ok(re) = regex::Regex::new(pattern) {
            if let Some(m) = re.find(title) {
                return Some(m.as_str().to_string());
            }
        }
    }
    None
}

fn extract_domain_from_title(title: &str) -> Option<String> {
    let known_sites = [
        ("ChatGPT", "chatgpt.com"),
        ("Claude", "claude.ai"),
        ("Gemini", "gemini.google.com"),
        ("Gmail", "mail.google.com"),
        ("YouTube", "youtube.com"),
        ("Twitter", "twitter.com"),
        ("X -", "x.com"),
        ("LinkedIn", "linkedin.com"),
        ("Facebook", "facebook.com"),
        ("Instagram", "instagram.com"),
        ("Reddit", "reddit.com"),
        ("GitHub", "github.com"),
        ("GitLab", "gitlab.com"),
        ("Stack Overflow", "stackoverflow.com"),
        ("Notion", "notion.so"),
        ("Slack", "slack.com"),
        ("Discord", "discord.com"),
        ("WhatsApp", "web.whatsapp.com"),
        ("Telegram", "web.telegram.org"),
        ("Google Docs", "docs.google.com"),
        ("Google Sheets", "sheets.google.com"),
        ("Google Drive", "drive.google.com"),
        ("Figma", "figma.com"),
        ("Trello", "trello.com"),
        ("Jira", "atlassian.net"),
        ("Confluence", "atlassian.net"),
        ("Asana", "asana.com"),
        ("Monday", "monday.com"),
        ("Airtable", "airtable.com"),
        ("Miro", "miro.com"),
        ("Canva", "canva.com"),
        ("Vercel", "vercel.com"),
        ("Netlify", "netlify.com"),
        ("AWS Console", "aws.amazon.com"),
        ("Azure Portal", "portal.azure.com"),
        ("Google Cloud", "console.cloud.google.com"),
        ("Perplexity", "perplexity.ai"),
        ("Midjourney", "midjourney.com"),
        ("OpenAI", "openai.com"),
        ("Anthropic", "anthropic.com"),
        ("Hugging Face", "huggingface.co"),
    ];

    let title_lower = title.to_lowercase();
    
    for (site_name, domain) in known_sites {
        if title_lower.contains(&site_name.to_lowercase()) {
            return Some(domain.to_string());
        }
    }
    
    None
}
