mod browser_url;
mod types;

pub use browser_url::get_browser_context;
pub use types::{BrowserContext, RecordingContext};

use once_cell::sync::Lazy;
use parking_lot::Mutex;

static RECORDING_CONTEXT: Lazy<Mutex<Option<RecordingContext>>> = Lazy::new(|| Mutex::new(None));

pub fn set_recording_context(ctx: RecordingContext) {
    *RECORDING_CONTEXT.lock() = Some(ctx);
}

pub fn take_recording_context() -> Option<RecordingContext> {
    RECORDING_CONTEXT.lock().take()
}

pub fn capture_context_at_record_start(app_name: &str, window_title: &str) -> RecordingContext {
    let browser = get_browser_context(app_name);
    RecordingContext {
        browser,
        window_title: window_title.to_string(),
        app_name: app_name.to_string(),
    }
}
