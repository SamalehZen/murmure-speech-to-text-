use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct BrowserContext {
    pub url: Option<String>,
    pub domain: Option<String>,
    pub browser: Option<String>,
}

#[derive(Default)]
pub struct RecordingContext {
    pub browser: BrowserContext,
    pub window_title: String,
    pub app_name: String,
}
