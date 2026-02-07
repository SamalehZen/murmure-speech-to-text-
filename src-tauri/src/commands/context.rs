use crate::context::{get_current_context, CurrentContext};
use tauri::command;

#[command]
pub fn get_active_context() -> Option<CurrentContext> {
    get_current_context()
}
