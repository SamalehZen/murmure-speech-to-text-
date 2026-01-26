use log::warn;
use reqwest::Client;
use std::time::Duration;

use super::crypto::{get_license_secret, get_supabase_key, get_supabase_url, verify_signature};
use super::types::{
    CheckSubscriptionParams, CheckSubscriptionResponse, HeartbeatRequest, RegisterDeviceRequest,
    SignedResponse,
};

const DEFAULT_TIMEOUT_SECS: u64 = 10;

pub struct LicenseClient {
    client: Client,
    base_url: String,
    api_key: String,
    license_secret: String,
}

impl LicenseClient {
    pub fn new(base_url: String, api_key: String, license_secret: String) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(DEFAULT_TIMEOUT_SECS))
            .build()
            .unwrap_or_else(|_| Client::new());

        Self {
            client,
            base_url,
            api_key,
            license_secret,
        }
    }

    pub fn from_env() -> Self {
        let base_url = get_supabase_url();
        let api_key = get_supabase_key();
        let license_secret = get_license_secret();
        Self::new(base_url, api_key, license_secret)
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

        let signed_response: SignedResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        let data_json = serde_json::to_string(&signed_response.data).map_err(|e| e.to_string())?;

        if !verify_signature(&data_json, &signed_response.signature, &self.license_secret) {
            warn!("Invalid signature detected in license response");
            return Err("Invalid response signature - possible tampering detected".to_string());
        }

        Ok(signed_response.data)
    }

    pub async fn check_subscription_unsigned(
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

        let text = response.text().await.map_err(|e| e.to_string())?;

        if let Ok(signed) = serde_json::from_str::<SignedResponse>(&text) {
            let data_json = serde_json::to_string(&signed.data).map_err(|e| e.to_string())?;

            if verify_signature(&data_json, &signed.signature, &self.license_secret) {
                return Ok(signed.data);
            } else {
                warn!("Invalid signature, but continuing with unsigned response for compatibility");
            }
        }

        serde_json::from_str::<CheckSubscriptionResponse>(&text)
            .map_err(|e| format!("Failed to parse response: {}", e))
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
