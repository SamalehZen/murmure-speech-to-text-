use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use reqwest::Client;

use super::gcloud_auth::GoogleCloudAuth;

pub struct Chirp3Client {
    auth: GoogleCloudAuth,
    location: String,
}

impl Chirp3Client {
    pub fn new(credentials_path: &str, location: String) -> Result<Self, String> {
        let auth = GoogleCloudAuth::from_file(credentials_path)?;
        Ok(Self { auth, location })
    }

    pub async fn transcribe(
        &self,
        audio_samples: Vec<f32>,
        sample_rate: u32,
    ) -> Result<String, String> {
        let access_token = self.auth.get_access_token().await?;
        let project_id = self.auth.project_id();

        let pcm_data = samples_to_pcm_16bit(&audio_samples);
        let audio_base64 = BASE64.encode(&pcm_data);

        let url = format!(
            "https://{}-speech.googleapis.com/v2/projects/{}/locations/{}/recognizers/_:recognize",
            self.location, project_id, self.location
        );

        let request_body = serde_json::json!({
            "config": {
                "explicitDecodingConfig": {
                    "encoding": "LINEAR16",
                    "sampleRateHertz": sample_rate,
                    "audioChannelCount": 1
                },
                "model": "chirp_2",
                "languageCodes": ["fr-FR", "en-US"],
                "features": {
                    "enableAutomaticPunctuation": true
                }
            },
            "content": audio_base64
        });

        let client = Client::new();
        let response = client
            .post(&url)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await
            .map_err(|e| format!("Chirp 3 request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("Chirp 3 API error: {}", error_text));
        }

        let result: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        let transcript = result
            .get("results")
            .and_then(|r| r.as_array())
            .map(|results| {
                results
                    .iter()
                    .filter_map(|r| {
                        r.get("alternatives")
                            .and_then(|a| a.as_array())
                            .and_then(|arr| arr.first())
                            .and_then(|a| a.get("transcript"))
                            .and_then(|t| t.as_str())
                    })
                    .collect::<Vec<_>>()
                    .join(" ")
            })
            .unwrap_or_default();

        Ok(transcript)
    }
}

fn samples_to_pcm_16bit(samples: &[f32]) -> Vec<u8> {
    samples
        .iter()
        .flat_map(|&s| {
            let clamped = s.clamp(-1.0, 1.0);
            let i16_sample = (clamped * 32767.0) as i16;
            i16_sample.to_le_bytes()
        })
        .collect()
}
