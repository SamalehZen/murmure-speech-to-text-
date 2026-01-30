use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "snake_case")]
pub enum EmojiUsage {
    Never,
    Rarely,
    #[default]
    Sometimes,
    Often,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "snake_case")]
pub enum Formality {
    Formal,
    #[default]
    Neutral,
    Casual,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "snake_case")]
pub enum MessageLength {
    Short,
    #[default]
    Medium,
    Long,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "snake_case")]
pub enum PunctuationStyle {
    Minimal,
    #[default]
    Standard,
    Expressive,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LearnedPatterns {
    pub greetings: Vec<String>,
    pub closings: Vec<String>,
    pub common_phrases: Vec<String>,
    pub emoji_usage: EmojiUsage,
    pub formality: Formality,
    pub average_length: MessageLength,
    pub punctuation_style: PunctuationStyle,
    pub uses_abbreviations: bool,
    pub uses_tutoring: bool,
}

impl Default for LearnedPatterns {
    fn default() -> Self {
        Self {
            greetings: Vec::new(),
            closings: Vec::new(),
            common_phrases: Vec::new(),
            emoji_usage: EmojiUsage::Sometimes,
            formality: Formality::Neutral,
            average_length: MessageLength::Medium,
            punctuation_style: PunctuationStyle::Standard,
            uses_abbreviations: false,
            uses_tutoring: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StyleProfile {
    pub app_name: String,
    pub patterns: LearnedPatterns,
    pub examples: Vec<String>,
    pub sample_count: u32,
    pub last_updated: String,
    pub enabled: bool,
}

impl StyleProfile {
    pub fn new(app_name: &str) -> Self {
        Self {
            app_name: app_name.to_string(),
            patterns: LearnedPatterns::default(),
            examples: Vec::new(),
            sample_count: 0,
            last_updated: chrono::Utc::now().to_rfc3339(),
            enabled: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StyleLearningSettings {
    pub enabled: bool,
    pub profiles: HashMap<String, StyleProfile>,
    pub min_samples_for_learning: u32,
    pub max_examples_stored: u32,
    pub excluded_apps: Vec<String>,
}

impl Default for StyleLearningSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            profiles: HashMap::new(),
            min_samples_for_learning: 5,
            max_examples_stored: 20,
            excluded_apps: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StylePreviewResult {
    pub original_text: String,
    pub styled_text: String,
    pub applied_rules: Vec<String>,
}
