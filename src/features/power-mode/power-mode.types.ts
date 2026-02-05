import type { LLMProvider } from '@/features/llm-connect/llm-connect.types';

export interface PowerModeConfig {
    id: string;
    name: string;
    emoji: string;
    is_enabled: boolean;
    priority: number;
    app_triggers: AppTrigger[];
    url_triggers: UrlTrigger[];
    is_ai_enhancement_enabled: boolean;
    selected_ai_provider: LLMProvider | null;
    selected_ai_model: string | null;
    prompt_template: string;
    use_screen_capture: boolean;
}

export interface AppTrigger {
    id: string;
    executable_name: string;
    display_name: string;
}

export interface UrlTrigger {
    id: string;
    pattern: string;
}

export interface PowerModeSession {
    active_power_mode_id: string | null;
    original_state: OriginalLLMState;
}

export interface OriginalLLMState {
    active_provider: string | null;
    active_model: string | null;
    prompt_template: string | null;
    is_ai_enhancement_enabled: boolean | null;
    use_screen_capture: boolean | null;
}

export interface InstalledApp {
    name: string;
    executable_path: string;
    executable_name: string;
}

export interface PowerModeSettings {
    power_modes: PowerModeConfig[];
    is_power_mode_enabled: boolean;
}

export const createDefaultPowerMode = (): PowerModeConfig => ({
    id: crypto.randomUUID(),
    name: '',
    emoji: '⚡',
    is_enabled: true,
    priority: 50,
    app_triggers: [],
    url_triggers: [],
    is_ai_enhancement_enabled: true,
    selected_ai_provider: null,
    selected_ai_model: null,
    prompt_template: `<role>You are a helpful assistant.</role>

<instructions>
Clean up and format the following transcription:
- Fix grammar and spelling errors
- Keep the original meaning intact
- Use appropriate punctuation
</instructions>

<input>{{TRANSCRIPT}}</input>`,
    use_screen_capture: false,
});

export const EMOJI_OPTIONS = [
    '⚡',
    '🚀',
    '💻',
    '📝',
    '📧',
    '💬',
    '🎮',
    '🎨',
    '📊',
    '🔧',
    '📱',
    '🌐',
    '📚',
    '🎵',
    '🎬',
    '💼',
    '🔬',
    '🏠',
    '✨',
    '🎯',
];
