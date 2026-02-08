import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useState, useEffect, useCallback } from 'react';

export const DEFAULT_BASE_PROMPT = `<role>
Your role is to correct a transcription produced by an ASR. You are not a conversational assistant.
</role>

<context>
Application: {{APP_NAME}}
Window: {{WINDOW_TITLE}}
Browser URL: {{BROWSER_URL}}
Domain: {{BROWSER_DOMAIN}}
</context>

<base_rules>
- Correct spelling and grammar.
- Remove repetitions and hesitations.
- Replace misrecognized words only if phonetically similar to dictionary words: <lexicon>{{DICTIONARY}}</lexicon>
- Never modify the meaning or content.
- Do not answer questions or comment on them.
- Remove all '*' characters and never add any.
- Do not generate any comment or introduction.
- If nothing to modify, return the transcription as is.
</base_rules>

<tone_specific>
{{TONE_INSTRUCTIONS}}
</tone_specific>

<input>{{TRANSCRIPT}}</input>
`;

export type LLMProviderType = 'ollama' | 'gemini' | 'openai' | 'openrouter' | 'groq';

export interface Tone {
    id: string;
    name: string;
    prompt: string;
    use_base_prompt: boolean;
    model: string;
    is_system: boolean;
    icon: string | null;
    provider?: LLMProviderType;
}

export interface CloudModel {
    id: string;
    name: string;
    provider: LLMProviderType;
}

export interface ProviderSettings {
    api_key: string;
    default_model: string;
    custom_endpoint?: string;
}

export interface CloudProvidersSettings {
    gemini: ProviderSettings;
    openai: ProviderSettings;
    openrouter: ProviderSettings;
    groq: ProviderSettings;
}

export interface AppMatcher {
    type: 'app' | 'domain';
    app_name?: string;
    process_name?: string;
    pattern?: string;
}

export interface RegisteredApp {
    id: string;
    matcher: AppMatcher;
    tone_id: string;
    display_name: string;
    icon: string | null;
}

export interface TonesSettings {
    base_prompt: string;
    tones: Tone[];
    registered_apps: RegisteredApp[];
    default_tone_id: string | null;
    manual_override_tone_id: string | null;
}

export interface ToneSelectionResult {
    tone: Tone;
    matched_by: MatchedBy;
}

export interface MatchedBy {
    type: 'ManualOverride' | 'Domain' | 'App' | 'Default';
    value?: string;
}

export const useTones = () => {
    const [settings, setSettings] = useState<TonesSettings>({
        base_prompt: '',
        tones: [],
        registered_apps: [],
        default_tone_id: null,
        manual_override_tone_id: null,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [currentSelection, setCurrentSelection] =
        useState<ToneSelectionResult | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        const unlistenSettings = listen<TonesSettings>(
            'tones-settings-updated',
            (event) => {
                setSettings(event.payload);
            }
        );

        const unlistenSelection = listen<ToneSelectionResult>(
            'tone-selected',
            (event) => {
                setCurrentSelection(event.payload);
            }
        );

        return () => {
            unlistenSettings.then((fn) => fn());
            unlistenSelection.then((fn) => fn());
        };
    }, []);

    const loadSettings = async () => {
        try {
            const loadedSettings =
                await invoke<TonesSettings>('get_tones_settings');
            setSettings(loadedSettings);
        } catch (error) {
            console.error('Failed to load tones settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveSettings = async (newSettings: TonesSettings) => {
        try {
            await invoke('set_tones_settings', { settings: newSettings });
            setSettings(newSettings);
        } catch (error) {
            console.error('Failed to save tones settings:', error);
            throw error;
        }
    };

    const updateSettings = useCallback(
        async (updates: Partial<TonesSettings>) => {
            const newSettings = { ...settings, ...updates };
            await saveSettings(newSettings);
        },
        [settings]
    );

    const addTone = useCallback(
        async (tone: Omit<Tone, 'id'>) => {
            const newTone: Tone = {
                ...tone,
                id: crypto.randomUUID(),
            };
            const newTones = [...settings.tones, newTone];
            await updateSettings({ tones: newTones });
            return newTone;
        },
        [settings.tones, updateSettings]
    );

    const updateTone = useCallback(
        async (id: string, updates: Partial<Tone>) => {
            const newTones = settings.tones.map((t) =>
                t.id === id ? { ...t, ...updates } : t
            );
            await updateSettings({ tones: newTones });
        },
        [settings.tones, updateSettings]
    );

    const deleteTone = useCallback(
        async (id: string) => {
            const tone = settings.tones.find((t) => t.id === id);
            if (tone?.is_system) {
                throw new Error('Cannot delete system tones');
            }

            const newTones = settings.tones.filter((t) => t.id !== id);
            const newRegisteredApps = settings.registered_apps.filter(
                (r) => r.tone_id !== id
            );
            const updates: Partial<TonesSettings> = {
                tones: newTones,
                registered_apps: newRegisteredApps,
            };

            if (settings.default_tone_id === id) {
                updates.default_tone_id = newTones[0]?.id || null;
            }
            if (settings.manual_override_tone_id === id) {
                updates.manual_override_tone_id = null;
            }

            await updateSettings(updates);
        },
        [settings, updateSettings]
    );

    const addRegisteredApp = useCallback(
        async (
            matcher: AppMatcher,
            displayName: string,
            toneId: string,
            icon?: string
        ) => {
            const newApp: RegisteredApp = {
                id: crypto.randomUUID(),
                matcher,
                tone_id: toneId,
                display_name: displayName,
                icon: icon || null,
            };
            const newRegisteredApps = [...settings.registered_apps, newApp];
            await updateSettings({ registered_apps: newRegisteredApps });
            return newApp;
        },
        [settings.registered_apps, updateSettings]
    );

    const updateRegisteredApp = useCallback(
        async (id: string, updates: Partial<RegisteredApp>) => {
            const newRegisteredApps = settings.registered_apps.map((r) =>
                r.id === id ? { ...r, ...updates } : r
            );
            await updateSettings({ registered_apps: newRegisteredApps });
        },
        [settings.registered_apps, updateSettings]
    );

    const deleteRegisteredApp = useCallback(
        async (id: string) => {
            const newRegisteredApps = settings.registered_apps.filter(
                (r) => r.id !== id
            );
            await updateSettings({ registered_apps: newRegisteredApps });
        },
        [settings.registered_apps, updateSettings]
    );

    const setDefaultTone = useCallback(
        async (toneId: string) => {
            await updateSettings({ default_tone_id: toneId });
        },
        [updateSettings]
    );

    const setManualOverride = useCallback(
        async (toneId: string | null) => {
            await updateSettings({ manual_override_tone_id: toneId });
        },
        [updateSettings]
    );

    const clearManualOverride = useCallback(async () => {
        try {
            await invoke('clear_tone_override');
        } catch (error) {
            console.error('Failed to clear manual override:', error);
        }
    }, []);

    const getToneById = useCallback(
        (id: string): Tone | undefined => {
            return settings.tones.find((t) => t.id === id);
        },
        [settings.tones]
    );

    const updateBasePrompt = useCallback(
        async (basePrompt: string) => {
            await updateSettings({ base_prompt: basePrompt });
        },
        [updateSettings]
    );

    return {
        settings,
        isLoading,
        currentSelection,
        loadSettings,
        updateSettings,
        addTone,
        updateTone,
        deleteTone,
        addRegisteredApp,
        updateRegisteredApp,
        deleteRegisteredApp,
        setDefaultTone,
        setManualOverride,
        clearManualOverride,
        getToneById,
        updateBasePrompt,
    };
};
