import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { SttMode, CloudSttProvider, CloudSttConfig } from '../initial-setup.types';

interface BackendCloudSttConfig {
    provider: CloudSttProvider;
    api_key: string;
    model: string;
}

interface BackendInitialSetupState {
    completed: boolean;
    stt_mode: SttMode;
    cloud_stt_config: BackendCloudSttConfig;
}

interface UseInitialSetupReturn {
    isCompleted: boolean | null;
    isLoading: boolean;
    sttMode: SttMode | null;
    cloudConfig: CloudSttConfig | null;
    completeSetup: (
        mode: SttMode,
        cloudProvider?: CloudSttProvider,
        apiKey?: string,
        model?: string
    ) => Promise<void>;
    setSttMode: (mode: SttMode) => Promise<void>;
    setCloudConfig: (config: CloudSttConfig) => Promise<void>;
}

export const useInitialSetup = (): UseInitialSetupReturn => {
    const [isCompleted, setIsCompleted] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [sttMode, setSttModeState] = useState<SttMode | null>(null);
    const [cloudConfig, setCloudConfigState] = useState<CloudSttConfig | null>(null);

    useEffect(() => {
        const checkSetup = async () => {
            try {
                const state = await invoke<BackendInitialSetupState>('get_initial_setup_state');
                setIsCompleted(state.completed);
                setSttModeState(state.stt_mode);
                if (state.cloud_stt_config.api_key.length > 0) {
                    setCloudConfigState({
                        provider: state.cloud_stt_config.provider,
                        api_key: state.cloud_stt_config.api_key,
                        model: state.cloud_stt_config.model,
                    });
                }
            } catch {
                setIsCompleted(false);
            } finally {
                setIsLoading(false);
            }
        };
        checkSetup();
    }, []);

    const completeSetup = useCallback(
        async (
            mode: SttMode,
            cloudProvider?: CloudSttProvider,
            apiKey?: string,
            model?: string
        ) => {
            await invoke('complete_initial_setup', {
                sttMode: mode,
                cloudProvider: cloudProvider || null,
                cloudApiKey: apiKey || null,
                cloudModel: model || null,
            });
            setIsCompleted(true);
            setSttModeState(mode);
            if (mode === 'cloud' && cloudProvider && apiKey) {
                setCloudConfigState({
                    provider: cloudProvider,
                    api_key: apiKey,
                    model: model || '',
                });
            }
        },
        []
    );

    const setSttMode = useCallback(async (mode: SttMode) => {
        await invoke('set_stt_mode', { mode });
        setSttModeState(mode);
    }, []);

    const setCloudConfig = useCallback(async (config: CloudSttConfig) => {
        await invoke('set_cloud_stt_config', {
            provider: config.provider,
            apiKey: config.api_key,
            model: config.model,
        });
        setCloudConfigState(config);
    }, []);

    return {
        isCompleted,
        isLoading,
        sttMode,
        cloudConfig,
        completeSetup,
        setSttMode,
        setCloudConfig,
    };
};
