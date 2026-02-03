export type SetupStep = 'welcome' | 'mode-choice' | 'cloud-config' | 'offline-download' | 'complete';

export type SttMode = 'cloud' | 'offline';

export type CloudSttProvider = 'openai' | 'groq' | 'google';

export interface CloudSttConfig {
    provider: CloudSttProvider;
    api_key: string;
    model: string;
}

export interface InitialSetupState {
    completed: boolean;
    selected_mode: SttMode | null;
    cloud_config: CloudSttConfig | null;
}

export const CLOUD_STT_PROVIDER_LABELS: Record<CloudSttProvider, string> = {
    openai: 'OpenAI Whisper',
    groq: 'Groq Whisper',
    google: 'Google Speech-to-Text',
};

export const CLOUD_STT_PROVIDER_MODELS: Record<CloudSttProvider, string[]> = {
    openai: ['whisper-1'],
    groq: ['whisper-large-v3', 'whisper-large-v3-turbo'],
    google: ['default'],
};

export const CLOUD_STT_PROVIDER_DEFAULT_MODEL: Record<CloudSttProvider, string> = {
    openai: 'whisper-1',
    groq: 'whisper-large-v3-turbo',
    google: 'default',
};
