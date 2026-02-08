import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect, useCallback } from 'react';
import {
    CloudProvidersSettings,
    LLMProviderType,
    CloudModel,
    ProviderSettings,
} from './use-tones';

const DEFAULT_SETTINGS: CloudProvidersSettings = {
    gemini: { api_key: '', default_model: 'gemini-2.0-flash' },
    openai: { api_key: '', default_model: 'gpt-4o-mini' },
    openrouter: { api_key: '', default_model: '' },
    groq: { api_key: '', default_model: 'llama-3.1-8b-instant' },
};

export const useCloudProviders = () => {
    const [settings, setSettings] =
        useState<CloudProvidersSettings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const [isTesting, setIsTesting] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const loaded =
                await invoke<CloudProvidersSettings>('get_cloud_providers_settings');
            setSettings(loaded);
        } catch (error) {
            console.error('Failed to load cloud providers settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveSettings = async (newSettings: CloudProvidersSettings) => {
        try {
            await invoke('set_cloud_providers_settings', { settings: newSettings });
            setSettings(newSettings);
        } catch (error) {
            console.error('Failed to save cloud providers settings:', error);
            throw error;
        }
    };

    const updateProvider = useCallback(
        async (provider: LLMProviderType, updates: Partial<ProviderSettings>) => {
            if (provider === 'ollama') return;

            const key = provider as keyof CloudProvidersSettings;
            const newSettings = {
                ...settings,
                [key]: { ...settings[key], ...updates },
            };
            await saveSettings(newSettings);
        },
        [settings]
    );

    const testConnection = useCallback(
        async (provider: LLMProviderType, apiKey: string): Promise<boolean> => {
            if (provider === 'ollama') return true;

            setIsTesting(true);
            try {
                const result = await invoke<boolean>('test_cloud_provider_connection', {
                    provider,
                    apiKey,
                });
                return result;
            } catch (error) {
                console.error('Connection test failed:', error);
                throw error;
            } finally {
                setIsTesting(false);
            }
        },
        []
    );

    const getModels = useCallback(
        async (provider: LLMProviderType): Promise<CloudModel[]> => {
            if (provider === 'ollama') return [];

            try {
                return await invoke<CloudModel[]>('get_cloud_models', { provider });
            } catch (error) {
                console.error('Failed to get cloud models:', error);
                return [];
            }
        },
        []
    );

    const getApiKey = useCallback(
        (provider: LLMProviderType): string => {
            if (provider === 'ollama') return '';
            const key = provider as keyof CloudProvidersSettings;
            return settings[key]?.api_key || '';
        },
        [settings]
    );

    const hasApiKey = useCallback(
        (provider: LLMProviderType): boolean => {
            if (provider === 'ollama') return true;
            return Boolean(getApiKey(provider));
        },
        [getApiKey]
    );

    return {
        settings,
        isLoading,
        isTesting,
        loadSettings,
        saveSettings,
        updateProvider,
        testConnection,
        getModels,
        getApiKey,
        hasApiKey,
    };
};
