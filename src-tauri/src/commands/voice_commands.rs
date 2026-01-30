use crate::voice_commands::{
    self, CommandParser, VoiceCommand, VoiceCommandSettings,
};
use tauri::{command, AppHandle, Emitter};

#[command]
pub fn get_voice_command_settings(app: AppHandle) -> VoiceCommandSettings {
    voice_commands::load_voice_command_settings(&app)
}

#[command]
pub fn set_voice_command_settings(
    app: AppHandle,
    settings: VoiceCommandSettings,
) -> Result<(), String> {
    voice_commands::save_voice_command_settings(&app, &settings)?;
    let _ = app.emit("voice-commands-updated", &settings);
    Ok(())
}

#[command]
pub fn toggle_voice_commands(app: AppHandle, enabled: bool) -> Result<(), String> {
    let mut settings = voice_commands::load_voice_command_settings(&app);
    settings.enabled = enabled;
    voice_commands::save_voice_command_settings(&app, &settings)?;
    let _ = app.emit("voice-commands-updated", &settings);
    Ok(())
}

#[command]
pub fn add_voice_command(app: AppHandle, command: VoiceCommand) -> Result<(), String> {
    let mut settings = voice_commands::load_voice_command_settings(&app);
    if settings.commands.iter().any(|c| c.id == command.id) {
        return Err(format!("Command with id '{}' already exists", command.id));
    }
    settings.commands.push(command);
    voice_commands::save_voice_command_settings(&app, &settings)?;
    let _ = app.emit("voice-commands-updated", &settings);
    Ok(())
}

#[command]
pub fn update_voice_command(app: AppHandle, command: VoiceCommand) -> Result<(), String> {
    let mut settings = voice_commands::load_voice_command_settings(&app);
    let index = settings
        .commands
        .iter()
        .position(|c| c.id == command.id)
        .ok_or_else(|| format!("Command with id '{}' not found", command.id))?;
    settings.commands[index] = command;
    voice_commands::save_voice_command_settings(&app, &settings)?;
    let _ = app.emit("voice-commands-updated", &settings);
    Ok(())
}

#[command]
pub fn delete_voice_command(app: AppHandle, command_id: String) -> Result<(), String> {
    let mut settings = voice_commands::load_voice_command_settings(&app);
    let original_len = settings.commands.len();
    settings.commands.retain(|c| c.id != command_id);
    if settings.commands.len() == original_len {
        return Err(format!("Command with id '{}' not found", command_id));
    }
    voice_commands::save_voice_command_settings(&app, &settings)?;
    let _ = app.emit("voice-commands-updated", &settings);
    Ok(())
}

#[command]
pub fn set_voice_command_signature(app: AppHandle, signature: String) -> Result<(), String> {
    let mut settings = voice_commands::load_voice_command_settings(&app);
    settings.signature.text = signature;
    voice_commands::save_voice_command_settings(&app, &settings)?;
    let _ = app.emit("voice-commands-updated", &settings);
    Ok(())
}

#[command]
pub fn preview_voice_commands(text: String, settings: VoiceCommandSettings) -> String {
    let mut parser = CommandParser::new(settings.commands.clone());
    parser.parse(&text, &settings)
}

#[command]
pub fn reset_voice_commands_to_default(app: AppHandle) -> Result<(), String> {
    let mut settings = voice_commands::load_voice_command_settings(&app);
    settings.commands = voice_commands::default_voice_commands();
    voice_commands::save_voice_command_settings(&app, &settings)?;
    let _ = app.emit("voice-commands-updated", &settings);
    Ok(())
}
