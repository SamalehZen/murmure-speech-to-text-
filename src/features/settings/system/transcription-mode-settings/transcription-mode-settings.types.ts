export type TranscriptionMode = 'offline' | 'cloud_fast' | 'cloud_precision';

export interface TranscriptionModeOption {
    value: TranscriptionMode;
    label: string;
    description: string;
    latency: string;
    requiresApiKey: boolean;
}

export const TRANSCRIPTION_MODES: TranscriptionModeOption[] = [
    {
        value: 'offline',
        label: 'Offline (Parakeet)',
        description: 'Local transcription, no internet required',
        latency: '~500ms',
        requiresApiKey: false,
    },
    {
        value: 'cloud_fast',
        label: 'Cloud Fast (Gemini Live)',
        description: 'Single-pass streaming, integrated transcription + formatting',
        latency: '~1.5s',
        requiresApiKey: true,
    },
    {
        value: 'cloud_precision',
        label: 'Cloud Precision (Chirp 3)',
        description: 'Best STT accuracy + LLM with parallel processing',
        latency: '~2.0s',
        requiresApiKey: true,
    },
];
