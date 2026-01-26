use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

const OBFUSCATION_KEY: u8 = 0x5A;

pub fn deobfuscate(obfuscated: &str) -> String {
    let bytes: Vec<u8> = (0..obfuscated.len())
        .step_by(2)
        .filter_map(|i| u8::from_str_radix(&obfuscated[i..i + 2], 16).ok())
        .map(|b| b ^ OBFUSCATION_KEY)
        .collect();

    String::from_utf8(bytes).unwrap_or_default()
}

pub fn verify_signature(data: &str, signature: &str, secret: &str) -> bool {
    let Ok(mut mac) = HmacSha256::new_from_slice(secret.as_bytes()) else {
        return false;
    };

    mac.update(data.as_bytes());

    let expected = hex::encode(mac.finalize().into_bytes());
    expected == signature
}

pub fn get_supabase_url() -> String {
    let obfuscated = env!("SUPABASE_URL_OBF");
    deobfuscate(obfuscated)
}

pub fn get_supabase_key() -> String {
    let obfuscated = env!("SUPABASE_KEY_OBF");
    deobfuscate(obfuscated)
}

pub fn get_license_secret() -> String {
    let obfuscated = env!("LICENSE_SECRET_OBF");
    deobfuscate(obfuscated)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deobfuscate() {
        let original = "hello";
        let key: u8 = 0x5A;
        let obfuscated: String = original
            .bytes()
            .map(|b| format!("{:02x}", b ^ key))
            .collect::<Vec<_>>()
            .join("");

        assert_eq!(deobfuscate(&obfuscated), original);
    }

    #[test]
    fn test_verify_signature() {
        use hmac::{Hmac, Mac};
        use sha2::Sha256;

        let data = r#"{"status":"active","timestamp":1234567890}"#;
        let secret = "test-secret";

        let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes()).unwrap();
        mac.update(data.as_bytes());
        let signature = hex::encode(mac.finalize().into_bytes());

        assert!(verify_signature(data, &signature, secret));
        assert!(!verify_signature(data, "invalid-signature", secret));
    }
}
