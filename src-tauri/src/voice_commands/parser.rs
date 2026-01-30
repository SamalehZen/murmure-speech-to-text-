use super::types::{CommandAction, VoiceCommand, VoiceCommandSettings};
use chrono::Local;

pub struct CommandParser {
    commands: Vec<VoiceCommand>,
    in_list_mode: bool,
    bold_open: bool,
    italic_open: bool,
}

impl CommandParser {
    pub fn new(commands: Vec<VoiceCommand>) -> Self {
        Self {
            commands,
            in_list_mode: false,
            bold_open: false,
            italic_open: false,
        }
    }

    pub fn parse(&mut self, text: &str, settings: &VoiceCommandSettings) -> String {
        if !settings.enabled {
            return text.to_string();
        }

        let mut result = text.to_string();

        let mut sorted_commands: Vec<_> = self.commands.iter().filter(|c| c.enabled).collect();
        sorted_commands.sort_by(|a, b| {
            let max_a = a.triggers.iter().map(|t| t.len()).max().unwrap_or(0);
            let max_b = b.triggers.iter().map(|t| t.len()).max().unwrap_or(0);
            max_b.cmp(&max_a)
        });

        for cmd in sorted_commands {
            for trigger in &cmd.triggers {
                let replacement = self.execute_action(&cmd.action, settings);
                result = replace_case_insensitive(&result, trigger, &replacement);
            }
        }

        result = clean_whitespace(&result);

        result
    }

    fn execute_action(&mut self, action: &CommandAction, settings: &VoiceCommandSettings) -> String {
        match action {
            CommandAction::InsertText(text) => text.clone(),
            CommandAction::InsertNewline => "\n".to_string(),
            CommandAction::InsertParagraph => "\n\n".to_string(),
            CommandAction::StartList => {
                self.in_list_mode = true;
                format!("\n{} ", settings.list_bullet)
            }
            CommandAction::EndList => {
                self.in_list_mode = false;
                "\n".to_string()
            }
            CommandAction::ListItem => {
                if self.in_list_mode {
                    format!("\n{} ", settings.list_bullet)
                } else {
                    String::new()
                }
            }
            CommandAction::StartBold => {
                self.bold_open = true;
                if settings.markdown_mode {
                    "**".to_string()
                } else {
                    String::new()
                }
            }
            CommandAction::EndBold => {
                self.bold_open = false;
                if settings.markdown_mode {
                    "**".to_string()
                } else {
                    String::new()
                }
            }
            CommandAction::StartItalic => {
                self.italic_open = true;
                if settings.markdown_mode {
                    "*".to_string()
                } else {
                    String::new()
                }
            }
            CommandAction::EndItalic => {
                self.italic_open = false;
                if settings.markdown_mode {
                    "*".to_string()
                } else {
                    String::new()
                }
            }
            CommandAction::InsertSignature => settings.signature.text.clone(),
            CommandAction::InsertDate => Local::now().format("%d/%m/%Y").to_string(),
            CommandAction::InsertTime => Local::now().format("%H:%M").to_string(),
            CommandAction::Undo => "[UNDO]".to_string(),
            CommandAction::ClearAll => "[CLEAR]".to_string(),
        }
    }
}

fn replace_case_insensitive(text: &str, pattern: &str, replacement: &str) -> String {
    let pattern_lower = pattern.to_lowercase();
    let text_lower = text.to_lowercase();

    let mut result = String::new();
    let mut last_end = 0;

    for (start, _) in text_lower.match_indices(&pattern_lower) {
        result.push_str(&text[last_end..start]);
        result.push_str(replacement);
        last_end = start + pattern.len();
    }
    result.push_str(&text[last_end..]);

    result
}

fn clean_whitespace(text: &str) -> String {
    let mut result = String::new();
    let mut prev_space = false;

    for c in text.chars() {
        if c == ' ' {
            if !prev_space {
                result.push(c);
                prev_space = true;
            }
        } else {
            result.push(c);
            prev_space = false;
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::voice_commands::types::default_voice_commands;

    fn create_test_settings() -> VoiceCommandSettings {
        VoiceCommandSettings {
            enabled: true,
            commands: default_voice_commands(),
            signature: super::super::types::SignatureConfig::default(),
            list_bullet: "•".to_string(),
            markdown_mode: true,
        }
    }

    #[test]
    fn test_punctuation_replacement() {
        let settings = create_test_settings();
        let mut parser = CommandParser::new(settings.commands.clone());
        let result = parser.parse("Bonjour point comment ça va point d'interrogation", &settings);
        assert_eq!(result, "Bonjour. comment ça va?");
    }

    #[test]
    fn test_newline_replacement() {
        let settings = create_test_settings();
        let mut parser = CommandParser::new(settings.commands.clone());
        let result = parser.parse("Première ligne nouvelle ligne Deuxième ligne", &settings);
        assert_eq!(result, "Première ligne\nDeuxième ligne");
    }

    #[test]
    fn test_list_mode() {
        let settings = create_test_settings();
        let mut parser = CommandParser::new(settings.commands.clone());
        let result = parser.parse("liste à puces Item 1 élément suivant Item 2 fin de liste", &settings);
        assert!(result.contains("• Item 1"));
        assert!(result.contains("• Item 2"));
    }

    #[test]
    fn test_markdown_bold() {
        let settings = create_test_settings();
        let mut parser = CommandParser::new(settings.commands.clone());
        let result = parser.parse("Ceci est en gras important fin gras texte", &settings);
        assert!(result.contains("**important**"));
    }

    #[test]
    fn test_disabled_commands() {
        let mut settings = create_test_settings();
        settings.enabled = false;
        let mut parser = CommandParser::new(settings.commands.clone());
        let result = parser.parse("Bonjour point", &settings);
        assert_eq!(result, "Bonjour point");
    }
}
