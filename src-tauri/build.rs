use std::env;

fn obfuscate(input: &str) -> String {
    let key: u8 = 0x5A;
    input
        .bytes()
        .map(|b| format!("{:02x}", b ^ key))
        .collect::<Vec<_>>()
        .join("")
}

fn main() {
    let supabase_url = env::var("SUPABASE_URL")
        .unwrap_or_else(|_| "https://YOUR_PROJECT.supabase.co/rest/v1".to_string());
    let supabase_key =
        env::var("SUPABASE_ANON_KEY").unwrap_or_else(|_| "YOUR_ANON_KEY".to_string());
    let license_secret = env::var("LICENSE_SECRET")
        .unwrap_or_else(|_| "default-secret-change-in-production".to_string());

    println!(
        "cargo:rustc-env=SUPABASE_URL_OBF={}",
        obfuscate(&supabase_url)
    );
    println!(
        "cargo:rustc-env=SUPABASE_KEY_OBF={}",
        obfuscate(&supabase_key)
    );
    println!(
        "cargo:rustc-env=LICENSE_SECRET_OBF={}",
        obfuscate(&license_secret)
    );

    println!("cargo:rerun-if-env-changed=SUPABASE_URL");
    println!("cargo:rerun-if-env-changed=SUPABASE_ANON_KEY");
    println!("cargo:rerun-if-env-changed=LICENSE_SECRET");

    tauri_build::build()
}
