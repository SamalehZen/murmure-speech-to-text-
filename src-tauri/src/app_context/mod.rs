pub mod classifier;
pub mod detector;
pub mod prompts;
pub mod types;

#[cfg(target_os = "windows")]
pub mod windows;

#[cfg(target_os = "linux")]
pub mod linux;

#[cfg(target_os = "macos")]
pub mod macos;

pub use classifier::classify_app;
pub use detector::*;
pub use prompts::{get_category_name, get_prompt_for_category};
pub use types::*;
