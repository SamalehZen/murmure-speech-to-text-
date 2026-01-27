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
        .unwrap_or_else(|_| "https://czgoichbeoabfhwvxura.supabase.co/rest/v1".to_string());
    let supabase_key = env::var("SUPABASE_ANON_KEY").unwrap_or_else(|_| {
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6Z29pY2hiZW9hYmZod3Z4dXJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NzY5NDMsImV4cCI6MjA4NTA1Mjk0M30.p583HHr39PClzfVeBr9RTDqhrl2z7IKLSmLJYA4bV_M".to_string()
    });
    let license_secret = env::var("LICENSE_SECRET")
        .unwrap_or_else(|_| "1cbb5c2d4104ce5f0431141a2cf7fdb3426c24e8fd0a1066963b4b399c8aec83".to_string());

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
