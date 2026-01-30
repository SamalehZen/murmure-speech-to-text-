use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveWindowInfo {
    pub app_name: String,
    pub window_title: String,
    pub process_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bundle_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exe_path: Option<String>,
}

impl Default for ActiveWindowInfo {
    fn default() -> Self {
        Self {
            app_name: String::new(),
            window_title: String::new(),
            process_name: String::new(),
            bundle_id: None,
            url: None,
            exe_path: None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AppCategory {
    Email,
    Chat,
    Notes,
    Code,
    Browser,
    Terminal,
    Office,
    Design,
    Social,
    Video,
    Music,
    Finance,
    Calendar,
    Productivity,
    Writing,
    Translation,
    Search,
    Shopping,
    Travel,
    News,
    Gaming,
    Education,
    Health,
    Default,
}

impl Default for AppCategory {
    fn default() -> Self {
        AppCategory::Default
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedApp {
    pub info: ActiveWindowInfo,
    pub category: AppCategory,
    pub prompt: Option<String>,
    pub matched_rule: Option<String>,
}

impl DetectedApp {
    pub fn new(info: ActiveWindowInfo) -> Self {
        Self {
            info,
            category: AppCategory::Default,
            prompt: None,
            matched_rule: None,
        }
    }

    pub fn with_category(mut self, category: AppCategory) -> Self {
        self.category = category;
        self
    }

    pub fn with_prompt(mut self, prompt: String, rule_name: String) -> Self {
        self.prompt = Some(prompt);
        self.matched_rule = Some(rule_name);
        self
    }
}
