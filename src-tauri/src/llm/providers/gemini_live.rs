use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use futures_util::{SinkExt, StreamExt};
use log::{debug, error, warn};
use tokio_tungstenite::{connect_async, tungstenite::Message};

const GEMINI_LIVE_MODEL: &str = "gemini-2.0-flash-live-001";
const GEMINI_LIVE_WS_URL: &str = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

pub struct GeminiLiveSession {
    api_key: String,
    system_instruction: String,
}

impl GeminiLiveSession {
    pub fn new(api_key: String, system_instruction: String) -> Self {
        Self {
            api_key,
            system_instruction,
        }
    }

    pub async fn transcribe_and_transform(
        &self,
        audio_samples: Vec<f32>,
        sample_rate: u32,
    ) -> Result<String, String> {
        let pcm_data = samples_to_pcm_16bit(&audio_samples);
        let audio_base64 = BASE64.encode(&pcm_data);

        debug!("Connecting to Gemini Live API with model: {}", GEMINI_LIVE_MODEL);
        let url = format!("{}?key={}", GEMINI_LIVE_WS_URL, self.api_key);
        let (mut ws_stream, _) = connect_async(&url)
            .await
            .map_err(|e| format!("WebSocket connection failed: {}", e))?;

        let setup_msg = serde_json::json!({
            "setup": {
                "model": format!("models/{}", GEMINI_LIVE_MODEL),
                "generation_config": {
                    "response_modalities": ["TEXT"]
                },
                "system_instruction": {
                    "parts": [{"text": self.system_instruction}]
                }
            }
        });
        debug!("Sending setup message");
        ws_stream
            .send(Message::Text(setup_msg.to_string().into()))
            .await
            .map_err(|e| format!("Failed to send setup: {}", e))?;

        let mut setup_complete = false;
        while let Some(msg) = ws_stream.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    let text_str = text.to_string();
                    debug!("Setup response: {}", text_str);
                    if let Ok(response) = serde_json::from_str::<serde_json::Value>(&text_str) {
                        if response.get("setupComplete").is_some() {
                            setup_complete = true;
                            debug!("Setup complete received");
                            break;
                        }
                        if let Some(error) = response.get("error") {
                            let error_msg = error.get("message")
                                .and_then(|m| m.as_str())
                                .unwrap_or("Unknown error");
                            error!("API error during setup: {}", error_msg);
                            return Err(format!("Gemini Live API error: {}", error_msg));
                        }
                    }
                }
                Ok(Message::Close(frame)) => {
                    let reason = frame.map(|f| f.reason.to_string()).unwrap_or_default();
                    error!("WebSocket closed during setup: {}", reason);
                    return Err(format!("WebSocket closed during setup: {}", reason));
                }
                Err(e) => {
                    error!("WebSocket error during setup: {}", e);
                    return Err(format!("WebSocket error during setup: {}", e));
                }
                _ => continue,
            }
        }

        if !setup_complete {
            return Err("Setup did not complete".to_string());
        }

        debug!("Sending audio data ({} bytes)", pcm_data.len());
        let audio_msg = serde_json::json!({
            "realtime_input": {
                "media_chunks": [{
                    "data": audio_base64,
                    "mime_type": format!("audio/pcm;rate={}", sample_rate)
                }]
            }
        });
        ws_stream
            .send(Message::Text(audio_msg.to_string().into()))
            .await
            .map_err(|e| format!("Failed to send audio: {}", e))?;

        let end_msg = serde_json::json!({"client_content": {"turn_complete": true}});
        ws_stream
            .send(Message::Text(end_msg.to_string().into()))
            .await
            .map_err(|e| format!("Failed to send end: {}", e))?;

        let mut result_text = String::new();
        let mut received_response = false;
        
        while let Some(msg) = ws_stream.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    let text_str = text.to_string();
                    debug!("Response: {}", text_str);
                    
                    if let Ok(response) = serde_json::from_str::<serde_json::Value>(&text_str) {
                        if let Some(error) = response.get("error") {
                            let error_msg = error.get("message")
                                .and_then(|m| m.as_str())
                                .unwrap_or("Unknown error");
                            error!("API error: {}", error_msg);
                            return Err(format!("Gemini Live API error: {}", error_msg));
                        }
                        
                        if let Some(text_part) = response
                            .get("serverContent")
                            .and_then(|c| c.get("modelTurn"))
                            .and_then(|t| t.get("parts"))
                            .and_then(|p| p.as_array())
                            .and_then(|arr| arr.first())
                            .and_then(|p| p.get("text"))
                            .and_then(|t| t.as_str())
                        {
                            result_text.push_str(text_part);
                            received_response = true;
                        }
                        
                        if response
                            .get("serverContent")
                            .and_then(|c| c.get("turnComplete"))
                            .and_then(|t| t.as_bool())
                            .unwrap_or(false)
                        {
                            debug!("Turn complete, result: {}", result_text);
                            break;
                        }
                    }
                }
                Ok(Message::Close(frame)) => {
                    let reason = frame.map(|f| f.reason.to_string()).unwrap_or_default();
                    if !received_response {
                        warn!("WebSocket closed without response: {}", reason);
                    }
                    break;
                }
                Err(e) => {
                    error!("WebSocket error: {}", e);
                    return Err(format!("WebSocket error: {}", e));
                }
                _ => continue,
            }
        }

        if result_text.is_empty() && !received_response {
            warn!("No transcription received from Gemini Live");
            return Err("No transcription received from Gemini Live API".to_string());
        }

        Ok(result_text.trim().to_string())
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
