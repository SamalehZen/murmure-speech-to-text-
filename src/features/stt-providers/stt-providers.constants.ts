import { STTProviderConfig, STT_PROVIDER_BASE_URLS } from './stt-providers.types';

export const DEFAULT_STT_PROVIDERS: Record<string, STTProviderConfig> = {
    offline: {
        provider: 'offline',
        api_key: undefined,
        base_url: STT_PROVIDER_BASE_URLS.offline,
        model: 'parakeet-tdt-0.6b-v2',
        available_models: ['parakeet-tdt-0.6b-v2'],
    },
    openai: {
        provider: 'openai',
        api_key: undefined,
        base_url: STT_PROVIDER_BASE_URLS.openai,
        model: 'whisper-1',
        available_models: ['whisper-1'],
    },
    google: {
        provider: 'google',
        api_key: undefined,
        base_url: STT_PROVIDER_BASE_URLS.google,
        model: 'gemini-2.0-flash',
        available_models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    },
    groq: {
        provider: 'groq',
        api_key: undefined,
        base_url: STT_PROVIDER_BASE_URLS.groq,
        model: 'whisper-large-v3',
        available_models: ['whisper-large-v3', 'whisper-large-v3-turbo', 'distil-whisper-large-v3-en'],
    },
};
