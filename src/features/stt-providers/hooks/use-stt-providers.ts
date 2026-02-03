import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
    STTSettings,
    STTProvider,
    STTProviderConfig,
    DownloadProgress,
} from '../stt-providers.types';
import { DEFAULT_STT_PROVIDERS } from '../stt-providers.constants';

export const useSTTProviders = () => {
    const [settings, setSettings] = useState<STTSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isModelAvailable, setIsModelAvailable] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
    const [modelSize, setModelSize] = useState<number | null>(null);

    const loadSettings = useCallback(async () => {
        try {
            const result = await invoke<STTSettings>('get_stt_settings');
            const mergedSettings = {
                ...result,
                providers: {
                    ...DEFAULT_STT_PROVIDERS,
                    ...result.providers,
                },
            };
            setSettings(mergedSettings);
        } catch (error) {
            console.error('Failed to load STT settings:', error);
            setSettings({
                active_provider: 'offline',
                providers: DEFAULT_STT_PROVIDERS,
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    const checkModelAvailability = useCallback(async () => {
        try {
            const available = await invoke<boolean>('is_offline_model_available');
            setIsModelAvailable(available);
            if (available) {
                const size = await invoke<number | null>('get_offline_model_size');
                setModelSize(size);
            }
        } catch (error) {
            console.error('Failed to check model availability:', error);
            setIsModelAvailable(false);
        }
    }, []);

    useEffect(() => {
        loadSettings();
        checkModelAvailability();

        const unlisten = listen<DownloadProgress>('model-download-progress', (event) => {
            setDownloadProgress(event.payload);
            if (event.payload.status === 'complete') {
                checkModelAvailability();
            }
        });

        return () => {
            unlisten.then((fn) => fn());
        };
    }, [loadSettings, checkModelAvailability]);

    const setActiveProvider = useCallback(async (provider: STTProvider) => {
        try {
            await invoke('set_active_stt_provider', { provider });
            setSettings((prev) => (prev ? { ...prev, active_provider: provider } : null));
        } catch (error) {
            console.error('Failed to set active STT provider:', error);
            throw error;
        }
    }, []);

    const saveProviderConfig = useCallback(
        async (provider: string, config: STTProviderConfig) => {
            try {
                await invoke('save_stt_provider_config', { provider, config });
                setSettings((prev) =>
                    prev
                        ? {
                              ...prev,
                              providers: {
                                  ...prev.providers,
                                  [provider]: config,
                              },
                          }
                        : null
                );
            } catch (error) {
                console.error('Failed to save STT provider config:', error);
                throw error;
            }
        },
        []
    );

    const testConnection = useCallback(
        async (provider: string): Promise<boolean> => {
            try {
                return await invoke<boolean>('test_stt_connection', { provider });
            } catch (error) {
                console.error('Failed to test STT connection:', error);
                return false;
            }
        },
        []
    );

    const fetchModels = useCallback(async (provider: string): Promise<string[]> => {
        try {
            return await invoke<string[]>('fetch_stt_models', { provider });
        } catch (error) {
            console.error('Failed to fetch STT models:', error);
            return [];
        }
    }, []);

    const downloadModel = useCallback(async () => {
        setDownloadProgress({
            downloaded: 0,
            total: 0,
            percentage: 0,
            status: 'downloading',
        });
        try {
            await invoke('download_offline_model');
        } catch (error) {
            console.error('Failed to download offline model:', error);
            setDownloadProgress(null);
            throw error;
        }
    }, []);

    const deleteModel = useCallback(async () => {
        try {
            await invoke('delete_offline_model');
            await checkModelAvailability();
            setModelSize(null);
        } catch (error) {
            console.error('Failed to delete offline model:', error);
            throw error;
        }
    }, [checkModelAvailability]);

    return {
        settings,
        isLoading,
        isModelAvailable,
        downloadProgress,
        modelSize,
        setActiveProvider,
        saveProviderConfig,
        testConnection,
        fetchModels,
        downloadModel,
        deleteModel,
    };
};
