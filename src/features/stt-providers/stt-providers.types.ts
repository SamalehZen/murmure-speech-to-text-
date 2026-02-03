export type STTProvider = 'offline' | 'openai' | 'google' | 'groq';

export interface STTProviderConfig {
    provider: STTProvider;
    api_key?: string;
    base_url: string;
    model: string;
    available_models: string[];
}

export interface STTSettings {
    active_provider: STTProvider;
    providers: Record<string, STTProviderConfig>;
}

export interface DownloadProgress {
    downloaded: number;
    total: number;
    percentage: number;
    status: 'downloading' | 'extracting' | 'complete' | 'error';
}

export const STT_PROVIDER_LABELS: Record<STTProvider, string> = {
    offline: 'Offline (Parakeet)',
    openai: 'OpenAI Whisper',
    google: 'Google Gemini',
    groq: 'Groq',
};

export const STT_PROVIDER_BASE_URLS: Record<STTProvider, string> = {
    offline: '',
    openai: 'https://api.openai.com/v1',
    google: 'https://generativelanguage.googleapis.com/v1beta',
    groq: 'https://api.groq.com/openai/v1',
};

export const STT_PROVIDERS: STTProvider[] = ['offline', 'openai', 'google', 'groq'];
