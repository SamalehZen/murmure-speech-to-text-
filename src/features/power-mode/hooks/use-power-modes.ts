import { useState, useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { powerModeApi } from '../api/power-mode.api';
import type { PowerModeConfig, PowerModeSettings } from '../power-mode.types';

export const usePowerModes = () => {
    const [settings, setSettings] = useState<PowerModeSettings>({
        power_modes: [],
        is_power_mode_enabled: false,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadSettings = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await powerModeApi.getSettings();
            setSettings(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load power modes');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSettings();

        const unlisten = listen<PowerModeSettings>('power-mode-settings-updated', (event) => {
            setSettings(event.payload);
        });

        return () => {
            unlisten.then((fn) => fn());
        };
    }, [loadSettings]);

    const savePowerMode = useCallback(async (config: PowerModeConfig) => {
        try {
            await powerModeApi.savePowerMode(config);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save power mode');
            throw err;
        }
    }, []);

    const deletePowerMode = useCallback(async (id: string) => {
        try {
            await powerModeApi.deletePowerMode(id);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete power mode');
            throw err;
        }
    }, []);

    const toggleEnabled = useCallback(async (enabled: boolean) => {
        try {
            await powerModeApi.toggleEnabled(enabled);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to toggle power mode');
            throw err;
        }
    }, []);

    return {
        powerModes: settings.power_modes,
        isEnabled: settings.is_power_mode_enabled,
        isLoading,
        error,
        savePowerMode,
        deletePowerMode,
        toggleEnabled,
        refresh: loadSettings,
    };
};
