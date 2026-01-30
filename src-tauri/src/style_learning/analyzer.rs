use super::types::*;
use std::collections::HashMap;

pub fn analyze_text(text: &str) -> LearnedPatterns {
    LearnedPatterns {
        emoji_usage: detect_emoji_usage(text),
        formality: detect_formality(text),
        average_length: detect_length(text),
        punctuation_style: detect_punctuation_style(text),
        greetings: extract_greetings(text),
        closings: extract_closings(text),
        common_phrases: extract_common_phrases(text),
        uses_abbreviations: detect_abbreviations(text),
        uses_tutoring: detect_tutoring(text),
    }
}

fn is_emoji(c: char) -> bool {
    matches!(c,
        '\u{1F300}'..='\u{1F9FF}' |
        '\u{2600}'..='\u{26FF}' |
        '\u{2700}'..='\u{27BF}' |
        '\u{1F600}'..='\u{1F64F}' |
        '\u{1F680}'..='\u{1F6FF}' |
        '\u{1F1E0}'..='\u{1F1FF}'
    )
}

fn detect_emoji_usage(text: &str) -> EmojiUsage {
    let emoji_count = text.chars().filter(|c| is_emoji(*c)).count();
    let word_count = text.split_whitespace().count();

    if emoji_count == 0 {
        EmojiUsage::Never
    } else if word_count > 0 {
        let ratio = emoji_count as f32 / word_count as f32;
        if ratio < 0.05 {
            EmojiUsage::Rarely
        } else if ratio < 0.15 {
            EmojiUsage::Sometimes
        } else {
            EmojiUsage::Often
        }
    } else {
        EmojiUsage::Sometimes
    }
}

fn detect_formality(text: &str) -> Formality {
    let text_lower = text.to_lowercase();

    let formal_markers = [
        "cordialement",
        "sincères",
        "veuillez",
        "madame",
        "monsieur",
        "je vous",
        "bien à vous",
        "respectueusement",
        "salutations",
        "distinguées",
    ];
    let casual_markers = [
        "salut", "coucou", "hey", "mdr", "lol", "genre", "trop", "kikou", "wesh", "bref", "ptn",
        "jsuis", "chuis",
    ];

    let formal_count = formal_markers
        .iter()
        .filter(|m| text_lower.contains(*m))
        .count();
    let casual_count = casual_markers
        .iter()
        .filter(|m| text_lower.contains(*m))
        .count();

    if formal_count > casual_count {
        Formality::Formal
    } else if casual_count > formal_count {
        Formality::Casual
    } else {
        Formality::Neutral
    }
}

fn detect_length(text: &str) -> MessageLength {
    let char_count = text.chars().count();
    if char_count < 50 {
        MessageLength::Short
    } else if char_count <= 150 {
        MessageLength::Medium
    } else {
        MessageLength::Long
    }
}

fn detect_punctuation_style(text: &str) -> PunctuationStyle {
    let exclamation_count = text.matches('!').count();
    let question_count = text.matches('?').count();
    let total_punctuation = exclamation_count + question_count;
    let word_count = text.split_whitespace().count();

    if word_count == 0 {
        return PunctuationStyle::Standard;
    }

    let ratio = total_punctuation as f32 / word_count as f32;

    let multiple_marks = text.contains("!!") || text.contains("??") || text.contains("!?");

    if multiple_marks || ratio > 0.15 {
        PunctuationStyle::Expressive
    } else if ratio < 0.03 {
        PunctuationStyle::Minimal
    } else {
        PunctuationStyle::Standard
    }
}

fn extract_greetings(text: &str) -> Vec<String> {
    let text_lower = text.to_lowercase();
    let greeting_patterns = [
        ("salut", "Salut"),
        ("coucou", "Coucou"),
        ("hey", "Hey"),
        ("bonjour", "Bonjour"),
        ("bonsoir", "Bonsoir"),
        ("hello", "Hello"),
        ("hi", "Hi"),
        ("yo", "Yo"),
        ("cher ", "Cher"),
        ("chère ", "Chère"),
    ];

    let mut found = Vec::new();
    for (pattern, display) in greeting_patterns {
        if text_lower.starts_with(pattern) || text_lower.contains(&format!("\n{}", pattern)) {
            if !found.contains(&display.to_string()) {
                found.push(display.to_string());
            }
        }
    }
    found
}

fn extract_closings(text: &str) -> Vec<String> {
    let text_lower = text.to_lowercase();
    let closing_patterns = [
        ("cordialement", "Cordialement"),
        ("bien à vous", "Bien à vous"),
        ("a+", "A+"),
        ("à+", "À+"),
        ("bises", "Bises"),
        ("bisous", "Bisous"),
        ("@+", "@+"),
        ("++", "++"),
        ("merci", "Merci"),
        ("ciao", "Ciao"),
        ("bye", "Bye"),
    ];

    let mut found = Vec::new();
    for (pattern, display) in closing_patterns {
        if text_lower.ends_with(pattern)
            || text_lower.contains(&format!("{}\n", pattern))
            || text_lower.contains(&format!("{}!", pattern))
        {
            if !found.contains(&display.to_string()) {
                found.push(display.to_string());
            }
        }
    }
    found
}

fn extract_common_phrases(text: &str) -> Vec<String> {
    let text_lower = text.to_lowercase();
    let common_patterns = [
        ("parfait", "Parfait"),
        ("nickel", "Nickel"),
        ("top", "Top"),
        ("cool", "Cool"),
        ("ok", "OK"),
        ("d'accord", "D'accord"),
        ("pas de souci", "Pas de souci"),
        ("pas de problème", "Pas de problème"),
        ("super", "Super"),
        ("génial", "Génial"),
        ("impeccable", "Impeccable"),
        ("no souci", "No souci"),
    ];

    let mut found = Vec::new();
    for (pattern, display) in common_patterns {
        if text_lower.contains(pattern) && !found.contains(&display.to_string()) {
            found.push(display.to_string());
        }
    }
    found
}

fn detect_abbreviations(text: &str) -> bool {
    let text_lower = text.to_lowercase();
    let abbreviations = [
        "mdr", "lol", "stp", "svp", "ptdr", "tkt", "bg", "jsp", "jsuis", "chuis", "pk", "pcq",
        "bcp", "vrmt", "slt", "rdv", "msg",
    ];

    abbreviations.iter().any(|abbr| text_lower.contains(abbr))
}

fn detect_tutoring(text: &str) -> bool {
    let text_lower = text.to_lowercase();
    let tu_markers = [" tu ", " te ", " ton ", " ta ", " tes ", " toi "];
    let vous_markers = [" vous ", " votre ", " vos "];

    let tu_count = tu_markers
        .iter()
        .filter(|m| text_lower.contains(*m))
        .count();
    let vous_count = vous_markers
        .iter()
        .filter(|m| text_lower.contains(*m))
        .count();

    tu_count >= vous_count
}

pub fn merge_patterns(existing: &LearnedPatterns, new: &LearnedPatterns, weight: f32) -> LearnedPatterns {
    let merge_vec = |existing: &[String], new: &[String], max: usize| -> Vec<String> {
        let mut merged: Vec<String> = existing.to_vec();
        for item in new {
            if !merged.contains(item) {
                merged.push(item.clone());
            }
        }
        if merged.len() > max {
            merged.truncate(max);
        }
        merged
    };

    let emoji_usage = if weight > 0.3 {
        new.emoji_usage.clone()
    } else {
        existing.emoji_usage.clone()
    };

    let formality = if weight > 0.3 {
        new.formality.clone()
    } else {
        existing.formality.clone()
    };

    let average_length = if weight > 0.3 {
        new.average_length.clone()
    } else {
        existing.average_length.clone()
    };

    let punctuation_style = if weight > 0.3 {
        new.punctuation_style.clone()
    } else {
        existing.punctuation_style.clone()
    };

    LearnedPatterns {
        greetings: merge_vec(&existing.greetings, &new.greetings, 5),
        closings: merge_vec(&existing.closings, &new.closings, 5),
        common_phrases: merge_vec(&existing.common_phrases, &new.common_phrases, 10),
        emoji_usage,
        formality,
        average_length,
        punctuation_style,
        uses_abbreviations: if weight > 0.5 {
            new.uses_abbreviations
        } else {
            existing.uses_abbreviations || new.uses_abbreviations
        },
        uses_tutoring: if weight > 0.5 {
            new.uses_tutoring
        } else {
            existing.uses_tutoring && new.uses_tutoring
        },
    }
}

pub fn generate_style_prompt(patterns: &LearnedPatterns) -> String {
    let mut instructions = Vec::new();

    match patterns.formality {
        Formality::Formal => {
            instructions.push("Utilise un ton formel et le vouvoiement".to_string())
        }
        Formality::Casual => {
            instructions.push("Utilise un ton décontracté et le tutoiement".to_string())
        }
        Formality::Neutral => {}
    }

    match patterns.emoji_usage {
        EmojiUsage::Often => instructions.push("Ajoute des emojis fréquemment".to_string()),
        EmojiUsage::Sometimes => {
            instructions.push("Ajoute un emoji occasionnellement si approprié".to_string())
        }
        EmojiUsage::Rarely | EmojiUsage::Never => {
            instructions.push("Évite les emojis".to_string())
        }
    }

    if !patterns.common_phrases.is_empty() {
        let phrases = patterns.common_phrases.join(", ");
        instructions.push(format!("Utilise les expressions favorites: {}", phrases));
    }

    if !patterns.greetings.is_empty() {
        let greetings = patterns.greetings.join(" ou ");
        instructions.push(format!("Commence par: {}", greetings));
    }

    if !patterns.closings.is_empty() {
        let closings = patterns.closings.join(" ou ");
        instructions.push(format!("Termine par: {}", closings));
    }

    match patterns.average_length {
        MessageLength::Short => {
            instructions.push("Garde le message court et concis".to_string())
        }
        MessageLength::Long => {
            instructions.push("Développe le message de manière complète".to_string())
        }
        MessageLength::Medium => {}
    }

    match patterns.punctuation_style {
        PunctuationStyle::Expressive => {
            instructions.push("Utilise une ponctuation expressive (! et ?)".to_string())
        }
        PunctuationStyle::Minimal => {
            instructions.push("Utilise une ponctuation minimale".to_string())
        }
        PunctuationStyle::Standard => {}
    }

    if patterns.uses_abbreviations {
        instructions.push("Utilise des abréviations courantes (mdr, stp, etc.)".to_string());
    }

    if !patterns.uses_tutoring {
        instructions.push("Utilise le vouvoiement".to_string());
    }

    if instructions.is_empty() {
        return String::new();
    }

    format!(
        "<user_style>\nAdapte le texte au style personnel de l'utilisateur:\n- {}\n</user_style>",
        instructions.join("\n- ")
    )
}

pub fn compute_pattern_statistics(profiles: &HashMap<String, StyleProfile>) -> HashMap<String, u32> {
    let mut stats = HashMap::new();
    stats.insert("total_profiles".to_string(), profiles.len() as u32);
    stats.insert(
        "total_samples".to_string(),
        profiles.values().map(|p| p.sample_count).sum(),
    );
    stats.insert(
        "active_profiles".to_string(),
        profiles.values().filter(|p| p.enabled).count() as u32,
    );
    stats
}
