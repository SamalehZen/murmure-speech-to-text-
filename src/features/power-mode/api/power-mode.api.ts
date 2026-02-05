import { invoke } from '@tauri-apps/api/core';
import type {
    PowerModeConfig,
    PowerModeSettings,
    PowerModeSession,
    InstalledApp,
    OriginalLLMState,
} from '../power-mode.types';

export const powerModeApi = {
    getSettings: (): Promise<PowerModeSettings> =>
        invoke<PowerModeSettings>('get_power_mode_settings'),

    saveSettings: (settings: PowerModeSettings): Promise<void> =>
        invoke('save_power_mode_settings', { settings }),

    getPowerModes: (): Promise<PowerModeConfig[]> =>
        invoke<PowerModeConfig[]>('get_power_modes'),

    savePowerMode: (config: PowerModeConfig): Promise<void> =>
        invoke('save_power_mode', { config }),

    deletePowerMode: (id: string): Promise<void> =>
        invoke('delete_power_mode', { id }),

    toggleEnabled: (enabled: boolean): Promise<void> =>
        invoke('toggle_power_mode_enabled', { enabled }),

    getInstalledApps: (): Promise<InstalledApp[]> =>
        invoke<InstalledApp[]>('get_installed_apps'),

    getActivePowerMode: (): Promise<PowerModeConfig | null> =>
        invoke<PowerModeConfig | null>('get_active_power_mode'),

    checkTrigger: (): Promise<string | null> =>
        invoke<string | null>('check_power_mode_trigger'),

    setSession: (
        powerModeId: string | null,
        originalState: OriginalLLMState | null
    ): Promise<void> =>
        invoke('set_power_mode_session', {
            power_mode_id: powerModeId,
            original_state: originalState,
        }),

    getSession: (): Promise<PowerModeSession> =>
        invoke<PowerModeSession>('get_power_mode_session'),

    clearSession: (): Promise<void> => invoke('clear_power_mode_session'),
};
