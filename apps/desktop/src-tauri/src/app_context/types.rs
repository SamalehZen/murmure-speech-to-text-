use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveWindowInfo {
    pub app_name: String,
    pub window_title: String,
    pub process_name: String,
}

impl Default for ActiveWindowInfo {
    fn default() -> Self {
        Self {
            app_name: String::new(),
            window_title: String::new(),
            process_name: String::new(),
        }
    }
}
