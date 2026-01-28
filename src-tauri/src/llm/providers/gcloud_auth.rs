use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Deserialize)]
pub struct ServiceAccountCredentials {
    pub client_email: String,
    pub private_key: String,
    pub project_id: String,
    pub token_uri: String,
}

#[derive(Debug, Serialize)]
struct JwtClaims {
    iss: String,
    scope: String,
    aud: String,
    iat: u64,
    exp: u64,
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
}

pub struct GoogleCloudAuth {
    credentials: ServiceAccountCredentials,
}

impl GoogleCloudAuth {
    pub fn from_file(path: &str) -> Result<Self, String> {
        let content = fs::read_to_string(path)
            .map_err(|e| format!("Failed to read credentials file: {}", e))?;

        let credentials: ServiceAccountCredentials = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse credentials JSON: {}", e))?;

        Ok(Self { credentials })
    }

    pub fn project_id(&self) -> &str {
        &self.credentials.project_id
    }

    pub async fn get_access_token(&self) -> Result<String, String> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|e| format!("Time error: {}", e))?
            .as_secs();

        let claims = JwtClaims {
            iss: self.credentials.client_email.clone(),
            scope: "https://www.googleapis.com/auth/cloud-platform".to_string(),
            aud: self.credentials.token_uri.clone(),
            iat: now,
            exp: now + 3600,
        };

        let header = Header::new(Algorithm::RS256);

        let encoding_key = EncodingKey::from_rsa_pem(self.credentials.private_key.as_bytes())
            .map_err(|e| format!("Invalid private key: {}", e))?;

        let jwt = encode(&header, &claims, &encoding_key)
            .map_err(|e| format!("Failed to encode JWT: {}", e))?;

        let client = Client::new();
        let params = [
            ("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer"),
            ("assertion", &jwt),
        ];

        let response = client
            .post(&self.credentials.token_uri)
            .form(&params)
            .send()
            .await
            .map_err(|e| format!("Token request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("Token exchange failed: {}", error_text));
        }

        let token_response: TokenResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse token response: {}", e))?;

        Ok(token_response.access_token)
    }
}
