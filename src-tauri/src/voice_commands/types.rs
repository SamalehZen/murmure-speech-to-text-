use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum CommandAction {
    InsertText(String),
    InsertNewline,
    InsertParagraph,
    StartList,
    EndList,
    ListItem,
    StartBold,
    EndBold,
    StartItalic,
    EndItalic,
    InsertSignature,
    Undo,
    ClearAll,
    InsertDate,
    InsertTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceCommand {
    pub id: String,
    pub triggers: Vec<String>,
    pub action: CommandAction,
    pub enabled: bool,
    pub category: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignatureConfig {
    pub text: String,
    pub per_app_signatures: HashMap<String, String>,
}

impl Default for SignatureConfig {
    fn default() -> Self {
        Self {
            text: String::new(),
            per_app_signatures: HashMap::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceCommandSettings {
    pub enabled: bool,
    pub commands: Vec<VoiceCommand>,
    pub signature: SignatureConfig,
    pub list_bullet: String,
    pub markdown_mode: bool,
}

impl Default for VoiceCommandSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            commands: default_voice_commands(),
            signature: SignatureConfig::default(),
            list_bullet: "•".to_string(),
            markdown_mode: false,
        }
    }
}

pub fn default_voice_commands() -> Vec<VoiceCommand> {
    vec![
        VoiceCommand {
            id: "cmd-period".to_string(),
            triggers: vec!["point".to_string(), "period".to_string()],
            action: CommandAction::InsertText(".".to_string()),
            enabled: true,
            category: "punctuation".to_string(),
        },
        VoiceCommand {
            id: "cmd-comma".to_string(),
            triggers: vec!["virgule".to_string(), "comma".to_string()],
            action: CommandAction::InsertText(",".to_string()),
            enabled: true,
            category: "punctuation".to_string(),
        },
        VoiceCommand {
            id: "cmd-exclamation".to_string(),
            triggers: vec![
                "point d'exclamation".to_string(),
                "exclamation mark".to_string(),
            ],
            action: CommandAction::InsertText("!".to_string()),
            enabled: true,
            category: "punctuation".to_string(),
        },
        VoiceCommand {
            id: "cmd-question".to_string(),
            triggers: vec![
                "point d'interrogation".to_string(),
                "question mark".to_string(),
            ],
            action: CommandAction::InsertText("?".to_string()),
            enabled: true,
            category: "punctuation".to_string(),
        },
        VoiceCommand {
            id: "cmd-colon".to_string(),
            triggers: vec!["deux points".to_string(), "colon".to_string()],
            action: CommandAction::InsertText(":".to_string()),
            enabled: true,
            category: "punctuation".to_string(),
        },
        VoiceCommand {
            id: "cmd-semicolon".to_string(),
            triggers: vec!["point virgule".to_string(), "semicolon".to_string()],
            action: CommandAction::InsertText(";".to_string()),
            enabled: true,
            category: "punctuation".to_string(),
        },
        VoiceCommand {
            id: "cmd-open-paren".to_string(),
            triggers: vec![
                "ouvrir parenthèse".to_string(),
                "open parenthesis".to_string(),
            ],
            action: CommandAction::InsertText("(".to_string()),
            enabled: true,
            category: "punctuation".to_string(),
        },
        VoiceCommand {
            id: "cmd-close-paren".to_string(),
            triggers: vec![
                "fermer parenthèse".to_string(),
                "close parenthesis".to_string(),
            ],
            action: CommandAction::InsertText(")".to_string()),
            enabled: true,
            category: "punctuation".to_string(),
        },
        VoiceCommand {
            id: "cmd-open-quote".to_string(),
            triggers: vec![
                "ouvrir guillemets".to_string(),
                "open quote".to_string(),
            ],
            action: CommandAction::InsertText("« ".to_string()),
            enabled: true,
            category: "punctuation".to_string(),
        },
        VoiceCommand {
            id: "cmd-close-quote".to_string(),
            triggers: vec![
                "fermer guillemets".to_string(),
                "close quote".to_string(),
            ],
            action: CommandAction::InsertText(" »".to_string()),
            enabled: true,
            category: "punctuation".to_string(),
        },
        VoiceCommand {
            id: "cmd-ellipsis".to_string(),
            triggers: vec![
                "points de suspension".to_string(),
                "ellipsis".to_string(),
            ],
            action: CommandAction::InsertText("...".to_string()),
            enabled: true,
            category: "punctuation".to_string(),
        },
        VoiceCommand {
            id: "cmd-dash".to_string(),
            triggers: vec!["tiret".to_string(), "dash".to_string()],
            action: CommandAction::InsertText(" - ".to_string()),
            enabled: true,
            category: "punctuation".to_string(),
        },
        VoiceCommand {
            id: "cmd-newline".to_string(),
            triggers: vec![
                "nouvelle ligne".to_string(),
                "new line".to_string(),
                "à la ligne".to_string(),
            ],
            action: CommandAction::InsertNewline,
            enabled: true,
            category: "navigation".to_string(),
        },
        VoiceCommand {
            id: "cmd-paragraph".to_string(),
            triggers: vec![
                "nouveau paragraphe".to_string(),
                "new paragraph".to_string(),
            ],
            action: CommandAction::InsertParagraph,
            enabled: true,
            category: "navigation".to_string(),
        },
        VoiceCommand {
            id: "cmd-tab".to_string(),
            triggers: vec!["tabulation".to_string(), "tab".to_string()],
            action: CommandAction::InsertText("\t".to_string()),
            enabled: true,
            category: "navigation".to_string(),
        },
        VoiceCommand {
            id: "cmd-start-list".to_string(),
            triggers: vec![
                "liste à puces".to_string(),
                "bullet list".to_string(),
                "commencer liste".to_string(),
            ],
            action: CommandAction::StartList,
            enabled: true,
            category: "lists".to_string(),
        },
        VoiceCommand {
            id: "cmd-end-list".to_string(),
            triggers: vec![
                "fin de liste".to_string(),
                "end list".to_string(),
                "terminer liste".to_string(),
            ],
            action: CommandAction::EndList,
            enabled: true,
            category: "lists".to_string(),
        },
        VoiceCommand {
            id: "cmd-list-item".to_string(),
            triggers: vec![
                "élément suivant".to_string(),
                "next item".to_string(),
                "puce suivante".to_string(),
            ],
            action: CommandAction::ListItem,
            enabled: true,
            category: "lists".to_string(),
        },
        VoiceCommand {
            id: "cmd-first-item".to_string(),
            triggers: vec![
                "premier élément".to_string(),
                "first item".to_string(),
                "premièrement".to_string(),
            ],
            action: CommandAction::InsertText("\n• ".to_string()),
            enabled: true,
            category: "lists".to_string(),
        },
        VoiceCommand {
            id: "cmd-start-bold".to_string(),
            triggers: vec![
                "en gras".to_string(),
                "bold".to_string(),
                "début gras".to_string(),
            ],
            action: CommandAction::StartBold,
            enabled: true,
            category: "formatting".to_string(),
        },
        VoiceCommand {
            id: "cmd-end-bold".to_string(),
            triggers: vec!["fin gras".to_string(), "end bold".to_string()],
            action: CommandAction::EndBold,
            enabled: true,
            category: "formatting".to_string(),
        },
        VoiceCommand {
            id: "cmd-start-italic".to_string(),
            triggers: vec![
                "en italique".to_string(),
                "italic".to_string(),
                "début italique".to_string(),
            ],
            action: CommandAction::StartItalic,
            enabled: true,
            category: "formatting".to_string(),
        },
        VoiceCommand {
            id: "cmd-end-italic".to_string(),
            triggers: vec!["fin italique".to_string(), "end italic".to_string()],
            action: CommandAction::EndItalic,
            enabled: true,
            category: "formatting".to_string(),
        },
        VoiceCommand {
            id: "cmd-signature".to_string(),
            triggers: vec![
                "signature".to_string(),
                "insérer signature".to_string(),
            ],
            action: CommandAction::InsertSignature,
            enabled: true,
            category: "special".to_string(),
        },
        VoiceCommand {
            id: "cmd-date".to_string(),
            triggers: vec![
                "date du jour".to_string(),
                "today's date".to_string(),
                "insérer date".to_string(),
            ],
            action: CommandAction::InsertDate,
            enabled: true,
            category: "special".to_string(),
        },
        VoiceCommand {
            id: "cmd-time".to_string(),
            triggers: vec![
                "heure actuelle".to_string(),
                "current time".to_string(),
                "insérer heure".to_string(),
            ],
            action: CommandAction::InsertTime,
            enabled: true,
            category: "special".to_string(),
        },
        VoiceCommand {
            id: "cmd-undo".to_string(),
            triggers: vec![
                "annuler".to_string(),
                "undo".to_string(),
                "effacer ça".to_string(),
            ],
            action: CommandAction::Undo,
            enabled: true,
            category: "control".to_string(),
        },
        VoiceCommand {
            id: "cmd-clear".to_string(),
            triggers: vec![
                "tout effacer".to_string(),
                "clear all".to_string(),
                "recommencer".to_string(),
            ],
            action: CommandAction::ClearAll,
            enabled: true,
            category: "control".to_string(),
        },
    ]
}
