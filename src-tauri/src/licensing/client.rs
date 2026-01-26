use reqwest::Client;
use std::time::Duration;

use super::types::{
    CheckSubscriptionParams, CheckSubscriptionResponse, HeartbeatRequest, RegisterDeviceRequest,
};

const DEFAULT_TIMEOUT_SECS: u64 = 10;

pub struct LicenseClient {
    client: Client,
    base_url: String,
    api_key: String,
}

impl LicenseClient {
    pub fn new(base_url: String, api_key: String) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(DEFAULT_TIMEOUT_SECS))
            .build()
            .unwrap_or_else(|_| Client::new());

        Self {
            client,
            base_url,
            api_key,
        }
    }

    pub fn from_env() -> Self {
        let base_url = std::env::var("SUPABASE_URL")
            .unwrap_or_else(|_| "https://YOUR_PROJECT.supabase.co/rest/v1".to_string());
        let api_key = std::env::var("SUPABASE_ANON_KEY").unwrap_or_default();
        Self::new(base_url, api_key)
    }

    pub async fn check_subscription(
        &self,
        device_id: &str,
    ) -> Result<CheckSubscriptionResponse, String> {
        let url = format!("{}/rpc/check_subscription", self.base_url);

        let params = CheckSubscriptionParams {
            p_device_id: device_id.to_string(),
        };

        let response = self
            .client
            .post(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", &self.api_key))
            .header("Content-Type", "application/json")
            .json(&params)
            .send()
            .await
            .map_err(|e| format!("Network error: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(format!("Server error {}: {}", status, body));
        }

        let result: CheckSubscriptionResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        Ok(result)
    }

    pub async fn register_device(&self, request: RegisterDeviceRequest) -> Result<(), String> {
        let url = format!("{}/rpc/register_device", self.base_url);

        let response = self
            .client
            .post(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", &self.api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("Network error: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(format!("Server error {}: {}", status, body));
        }

        Ok(())
    }

    pub async fn heartbeat(&self, device_id: &str) -> Result<(), String> {
        let url = format!("{}/rpc/heartbeat", self.base_url);

        let request = HeartbeatRequest {
            device_id: device_id.to_string(),
        };

        let response = self
            .client
            .post(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", &self.api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("Network error: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(format!("Server error {}: {}", status, body));
        }

        Ok(())
    }
}
