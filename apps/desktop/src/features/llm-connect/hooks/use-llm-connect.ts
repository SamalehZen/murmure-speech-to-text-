import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
    LLMProvider,
    ProviderConfig,
    AppPromptRule,
    ActiveWindowInfo,
    PROVIDER_BASE_URLS,
} from '../llm-connect.types';

export interface LLMMode {
    name: string;
    prompt: string;
    model: string;
    shortcut: string;
}

export interface LLMConnectSettings {
    url: string;
    model: string;
    prompt: string;
    modes: LLMMode[];
    active_mode_index: number;
    onboarding_completed: boolean;
    active_provider: LLMProvider;
    providers: Record<string, ProviderConfig>;
    app_detection_enabled: boolean;
    app_rules: AppPromptRule[];
}

export interface OllamaModel {
    name: string;
}

export type ConnectionStatus =
    | 'disconnected'
    | 'connected'
    | 'testing'
    | 'error';

const defaultProviders: Record<string, ProviderConfig> = {
    ollama: {
        provider: 'ollama',
        api_key: undefined,
        base_url: PROVIDER_BASE_URLS.ollama,
        model: '',
        available_models: [],
    },
    openai: {
        provider: 'openai',
        api_key: undefined,
        base_url: PROVIDER_BASE_URLS.openai,
        model: 'gpt-4o-mini',
        available_models: [],
    },
    anthropic: {
        provider: 'anthropic',
        api_key: undefined,
        base_url: PROVIDER_BASE_URLS.anthropic,
        model: 'claude-3-5-sonnet-latest',
        available_models: [
            'claude-3-5-sonnet-latest',
            'claude-3-5-haiku-latest',
            'claude-3-opus-latest',
        ],
    },
    google: {
        provider: 'google',
        api_key: undefined,
        base_url: PROVIDER_BASE_URLS.google,
        model: 'gemini-2.5-flash',
        available_models: [],
    },
    openrouter: {
        provider: 'openrouter',
        api_key: undefined,
        base_url: PROVIDER_BASE_URLS.openrouter,
        model: '',
        available_models: [],
    },
};

export const useLLMConnect = () => {
    const { t } = useTranslation();
    const [settings, setSettings] = useState<LLMConnectSettings>({
        url: 'http://localhost:11434/api',
        model: '',
        prompt: '',
        modes: [],
        active_mode_index: 0,
        onboarding_completed: false,
        active_provider: 'ollama',
        providers: defaultProviders,
        app_detection_enabled: false,
        app_rules: [],
    });
    const [models, setModels] = useState<OllamaModel[]>([]);
    const [connectionStatus, setConnectionStatus] =
        useState<ConnectionStatus>('disconnected');
    const [isLoading, setIsLoading] = useState(false);
    const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
    const [currentActiveWindow, setCurrentActiveWindow] = useState<ActiveWindowInfo | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        const unlisten = listen<string>('llm-error', (event) => {
            toast.error(t('LLM processing failed') + ' : ' + event.payload);
        });

        return () => {
            unlisten.then((fn) => fn());
        };
    }, [t]);

    useEffect(() => {
        const unlisten = listen<LLMConnectSettings>(
            'llm-settings-updated',
            (event) => {
                setSettings(event.payload);
            }
        );

        return () => {
            unlisten.then((fn) => fn());
        };
    }, []);

    const loadSettings = async () => {
        try {
            const loadedSettings = await invoke<LLMConnectSettings>(
                'get_llm_connect_settings'
            );
            const mergedSettings = {
                ...loadedSettings,
                providers: {
                    ...defaultProviders,
                    ...loadedSettings.providers,
                },
            };
            setSettings(mergedSettings);
            setIsSettingsLoaded(true);

            if (loadedSettings.url) {
                const connected = await testConnection(loadedSettings.url);
                if (connected) {
                    await fetchModels(loadedSettings.url);
                }
            }
        } catch (error) {
            console.error('Failed to load LLM Connect settings:', error);
            setIsSettingsLoaded(true);
        }
    };

    const saveSettings = async (newSettings: LLMConnectSettings) => {
        try {
            await invoke('set_llm_connect_settings', { settings: newSettings });
            setSettings(newSettings);
        } catch (error) {
            console.error('Failed to save LLM Connect settings:', error);
            throw error;
        }
    };

    const testConnection = useCallback(
        async (url?: string) => {
            const testUrl = url || settings.url;
            setConnectionStatus('testing');

            try {
                const result = await invoke<boolean>('test_llm_connection', {
                    url: testUrl,
                });
                setConnectionStatus(result ? 'connected' : 'error');
                return result;
            } catch (error) {
                console.error('Connection test failed:', error);
                setConnectionStatus('error');
                return false;
            }
        },
        [settings.url]
    );

    const fetchModels = useCallback(
        async (url?: string) => {
            const fetchUrl = url || settings.url;
            setIsLoading(true);

            try {
                const fetchedModels = await invoke<OllamaModel[]>(
                    'fetch_ollama_models',
                    { url: fetchUrl }
                );
                setModels(fetchedModels);
                setConnectionStatus('connected');
                return fetchedModels;
            } catch (error) {
                console.error('Failed to fetch models:', error);
                setConnectionStatus('error');
                setModels([]);
                throw error;
            } finally {
                setIsLoading(false);
            }
        },
        [settings.url]
    );

    const pullModel = useCallback(
        async (model: string) => {
            try {
                await invoke('pull_ollama_model', {
                    url: settings.url,
                    model,
                });
            } catch (error) {
                console.error('Failed to pull model:', error);
                throw error;
            }
        },
        [settings.url]
    );

    const completeOnboarding = async () => {
        await updateSettings({ onboarding_completed: true });
    };

    const updateSettings = async (updates: Partial<LLMConnectSettings>) => {
        const newSettings = { ...settings, ...updates };
        await saveSettings(newSettings);
    };

    const setActiveProvider = useCallback(
        async (provider: LLMProvider) => {
            try {
                await invoke('set_active_provider', { provider });
                setSettings((prev) => ({ ...prev, active_provider: provider }));
            } catch (error) {
                console.error('Failed to set active provider:', error);
                throw error;
            }
        },
        []
    );

    const saveProviderConfig = useCallback(
        async (provider: LLMProvider, config: ProviderConfig) => {
            try {
                await invoke('save_provider_config', { provider, config });
                setSettings((prev) => ({
                    ...prev,
                    providers: {
                        ...prev.providers,
                        [provider]: config,
                    },
                }));
            } catch (error) {
                console.error('Failed to save provider config:', error);
                throw error;
            }
        },
        []
    );

    const fetchProviderModels = useCallback(
        async (provider: LLMProvider): Promise<string[]> => {
            const config = settings.providers[provider];
            if (!config) {
                throw new Error('Provider not configured');
            }

            try {
                const fetchedModels = await invoke<string[]>('fetch_provider_models', {
                    provider,
                    apiKey: config.api_key || '',
                    baseUrl: config.base_url,
                });
                return fetchedModels;
            } catch (error) {
                console.error('Failed to fetch provider models:', error);
                throw error;
            }
        },
        [settings.providers]
    );

    const testProviderConnection = useCallback(
        async (provider: LLMProvider): Promise<boolean> => {
            const config = settings.providers[provider];
            if (!config) {
                throw new Error('Provider not configured');
            }

            try {
                const result = await invoke<boolean>('test_provider_connection', {
                    provider,
                    apiKey: config.api_key || '',
                    baseUrl: config.base_url,
                });
                return result;
            } catch (error) {
                console.error('Failed to test provider connection:', error);
                throw error;
            }
        },
        [settings.providers]
    );

    const toggleAppDetection = useCallback(
        async (enabled: boolean) => {
            try {
                await invoke('toggle_app_detection', { enabled });
                setSettings((prev) => ({ ...prev, app_detection_enabled: enabled }));
            } catch (error) {
                console.error('Failed to toggle app detection:', error);
                throw error;
            }
        },
        []
    );

    const saveAppRules = useCallback(
        async (rules: AppPromptRule[]) => {
            try {
                await invoke('save_app_rules', { rules });
                setSettings((prev) => ({ ...prev, app_rules: rules }));
            } catch (error) {
                console.error('Failed to save app rules:', error);
                throw error;
            }
        },
        []
    );

    const refreshActiveWindow = useCallback(async () => {
        try {
            const windowInfo = await invoke<ActiveWindowInfo>('get_current_active_window');
            setCurrentActiveWindow(windowInfo);
        } catch (error) {
            console.error('Failed to get active window:', error);
            setCurrentActiveWindow(null);
        }
    }, []);

    const testAppRule = useCallback(
        async (rule: AppPromptRule): Promise<boolean> => {
            try {
                const result = await invoke<boolean>('test_app_rule', { rule });
                return result;
            } catch (error) {
                console.error('Failed to test app rule:', error);
                return false;
            }
        },
        []
    );

    return {
        settings,
        models,
        connectionStatus,
        isLoading,
        isSettingsLoaded,
        loadSettings,
        saveSettings,
        updateSettings,
        testConnection,
        fetchModels,
        pullModel,
        completeOnboarding,
        activeProvider: settings.active_provider,
        providers: settings.providers,
        setActiveProvider,
        saveProviderConfig,
        fetchProviderModels,
        testProviderConnection,
        appDetectionEnabled: settings.app_detection_enabled,
        appRules: settings.app_rules,
        currentActiveWindow,
        toggleAppDetection,
        saveAppRules,
        refreshActiveWindow,
        testAppRule,
    };
};
