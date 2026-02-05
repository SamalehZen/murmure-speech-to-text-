use super::types::{OriginalLLMState, PowerModeSession};
use std::sync::Mutex;

static SESSION: Mutex<PowerModeSession> = Mutex::new(PowerModeSession {
    active_power_mode_id: None,
    original_state: OriginalLLMState {
        active_provider: None,
        active_model: None,
        prompt_template: None,
        is_ai_enhancement_enabled: None,
        use_screen_capture: None,
    },
});

pub fn get_session() -> PowerModeSession {
    SESSION.lock().unwrap().clone()
}

pub fn set_active_power_mode(
    power_mode_id: Option<String>,
    original_state: Option<OriginalLLMState>,
) {
    let mut session = SESSION.lock().unwrap();
    session.active_power_mode_id = power_mode_id;
    if let Some(state) = original_state {
        session.original_state = state;
    }
}

pub fn clear_session() {
    let mut session = SESSION.lock().unwrap();
    session.active_power_mode_id = None;
    session.original_state = OriginalLLMState::default();
}

pub fn get_active_power_mode_id() -> Option<String> {
    SESSION.lock().unwrap().active_power_mode_id.clone()
}

pub fn get_original_state() -> OriginalLLMState {
    SESSION.lock().unwrap().original_state.clone()
}
