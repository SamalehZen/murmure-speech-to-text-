import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useState, useEffect } from 'react';
import { TranscriptionMode } from '../transcription-mode-settings.types';

export const useTranscriptionModeState = () => {
    const [mode, setMode] = useState<TranscriptionMode>('offline');
    const [hasGoogleApiKey, setHasGoogleApiKey] = useState(false);
    const [hasGoogleCloudCredentials, setHasGoogleCloudCredentials] = useState(false);
    const [credentialsPath, setCredentialsPath] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadSettings = async () => {
        try {
            const currentMode = await invoke<string>('get_transcription_mode');
            if (
                currentMode === 'offline' ||
                currentMode === 'cloud_fast' ||
                currentMode === 'cloud_precision'
            ) {
                setMode(currentMode);
            }

            const hasKey = await invoke<boolean>('has_google_api_key');
            setHasGoogleApiKey(hasKey);

            const hasCredentials = await invoke<boolean>('has_google_cloud_credentials');
            setHasGoogleCloudCredentials(hasCredentials);

            const path = await invoke<string | null>('get_google_cloud_credentials_path');
            setCredentialsPath(path);
        } catch (error) {
            console.error('Failed to load transcription mode settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const updateMode = async (newMode: TranscriptionMode): Promise<boolean> => {
        try {
            await invoke('set_transcription_mode', { mode: newMode });
            setMode(newMode);
            return true;
        } catch (error) {
            console.error('Failed to update transcription mode:', error);
            return false;
        }
    };

    const selectCredentialsFile = async (): Promise<boolean> => {
        try {
            const selected = await open({
                multiple: false,
                filters: [{ name: 'JSON', extensions: ['json'] }],
            });

            if (selected != null && typeof selected === 'string') {
                await invoke('set_google_cloud_credentials_path', { path: selected });
                setCredentialsPath(selected);
                await loadSettings();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to select credentials file:', error);
            return false;
        }
    };

    const clearCredentialsFile = async (): Promise<boolean> => {
        try {
            await invoke('set_google_cloud_credentials_path', { path: null });
            setCredentialsPath(null);
            setHasGoogleCloudCredentials(false);
            return true;
        } catch (error) {
            console.error('Failed to clear credentials file:', error);
            return false;
        }
    };

    return {
        mode,
        setMode: updateMode,
        hasGoogleApiKey,
        hasGoogleCloudCredentials,
        credentialsPath,
        selectCredentialsFile,
        clearCredentialsFile,
        isLoading,
    };
};
