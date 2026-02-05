import type { LLMProvider } from '@/features/llm-connect/llm-connect.types';

export type TriggerMatchType =
    | 'app_name_contains'
    | 'window_title_contains'
    | 'process_name_equals'
    | 'window_title_regex'
    | 'url_contains'
    | 'url_regex'
    | 'url_domain_equals';

export interface TriggerRule {
    id: string;
    name: string;
    match_type: TriggerMatchType;
    pattern: string;
    enabled: boolean;
}

export interface PowerModeConfig {
    id: string;
    name: string;
    emoji: string;
    is_enabled: boolean;
    priority: number;
    triggers: TriggerRule[];
    is_ai_enhancement_enabled: boolean;
    selected_ai_provider: LLMProvider | null;
    selected_ai_model: string | null;
    prompt_template: string;
    use_screen_capture: boolean;
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
    triggers: [],
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

export const createAppTrigger = (
    executableName: string,
    displayName: string
): TriggerRule => ({
    id: crypto.randomUUID(),
    name: displayName,
    match_type: 'process_name_equals',
    pattern: executableName,
    enabled: true,
});

export const createUrlTrigger = (domain: string): TriggerRule => ({
    id: crypto.randomUUID(),
    name: domain,
    match_type: 'url_domain_equals',
    pattern: domain,
    enabled: true,
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

export const isAppTrigger = (trigger: TriggerRule): boolean =>
    trigger.match_type === 'app_name_contains' ||
    trigger.match_type === 'window_title_contains' ||
    trigger.match_type === 'process_name_equals' ||
    trigger.match_type === 'window_title_regex';

export const isUrlTrigger = (trigger: TriggerRule): boolean =>
    trigger.match_type === 'url_contains' ||
    trigger.match_type === 'url_regex' ||
    trigger.match_type === 'url_domain_equals';
