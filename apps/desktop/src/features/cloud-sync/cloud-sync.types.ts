export interface CloudUser {
    id: string;
    email: string;
    name?: string;
    role: string;
    plan: string;
}

export interface CloudAuthState {
    is_authenticated: boolean;
    user?: CloudUser;
    token?: string;
    backend_url?: string;
}

export interface SyncStatus {
    last_sync?: string;
    config_hash?: string;
    is_syncing: boolean;
    error?: string;
}

export interface ShortcutConfig {
    id: string;
    action: string;
    keys: string[];
    enabled: boolean;
}

export interface ProviderConfig {
    enabled: boolean;
    model: string;
    temperature: number;
    max_tokens: number;
}

export interface LLMProviders {
    openai?: ProviderConfig;
    anthropic?: ProviderConfig;
    google?: ProviderConfig;
}

export interface LLMSettings {
    default_provider: string;
    fallback_order: string[];
    providers: LLMProviders;
}

export interface DictionaryEntry {
    id: string;
    spoken: string;
    written: string;
    category: string;
    case_sensitive: boolean;
}

export interface FormattingRule {
    id: string;
    name: string;
    type: string;
    enabled: boolean;
    order: number;
    config?: Record<string, unknown>;
}

export interface AppPrompt {
    id: string;
    app_name: string;
    process_names: string[];
    window_title_contains?: string;
    system_prompt: string;
    enabled: boolean;
}

export interface GlobalConfig {
    shortcuts: ShortcutConfig[];
    llm_settings: LLMSettings;
    dictionary: DictionaryEntry[];
    formatting_rules: FormattingRule[];
    app_prompts: AppPrompt[];
    updated_at: string;
}
