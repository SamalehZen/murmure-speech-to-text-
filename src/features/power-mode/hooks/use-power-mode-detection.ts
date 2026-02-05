import { useEffect, useRef, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { powerModeApi } from '../api/power-mode.api';
import type { PowerModeConfig, OriginalLLMState } from '../power-mode.types';

interface PowerModeDetectionOptions {
    isEnabled: boolean;
    powerModes: PowerModeConfig[];
    onActivate?: (powerMode: PowerModeConfig) => void;
    onDeactivate?: (originalState: OriginalLLMState) => void;
}

export const usePowerModeDetection = ({
    isEnabled,
    powerModes,
    onActivate,
    onDeactivate,
}: PowerModeDetectionOptions) => {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastActiveIdRef = useRef<string | null>(null);

    const checkTrigger = useCallback(async () => {
        if (!isEnabled || powerModes.length === 0) {
            if (lastActiveIdRef.current !== null) {
                const session = await powerModeApi.getSession();
                if (onDeactivate && session.original_state) {
                    onDeactivate(session.original_state);
                }
                await powerModeApi.clearSession();
                lastActiveIdRef.current = null;
            }
            return;
        }

        try {
            const matchedId = await powerModeApi.checkTrigger();

            if (matchedId !== lastActiveIdRef.current) {
                if (matchedId !== null) {
                    const powerMode = powerModes.find((pm) => pm.id === matchedId);
                    if (powerMode && onActivate) {
                        onActivate(powerMode);
                    }
                } else if (lastActiveIdRef.current !== null) {
                    const session = await powerModeApi.getSession();
                    if (onDeactivate && session.original_state) {
                        onDeactivate(session.original_state);
                    }
                    await powerModeApi.clearSession();
                }
                lastActiveIdRef.current = matchedId;
            }
        } catch (err) {
            console.error('Power mode detection error:', err);
        }
    }, [isEnabled, powerModes, onActivate, onDeactivate]);

    useEffect(() => {
        if (isEnabled) {
            checkTrigger();
            intervalRef.current = setInterval(checkTrigger, 500);
        } else {
            if (intervalRef.current !== null) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current !== null) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isEnabled, checkTrigger]);

    useEffect(() => {
        const unlistenActivated = listen<{ power_mode_id: string; power_mode_name: string }>(
            'power-mode-activated',
            (event) => {
                const powerMode = powerModes.find((pm) => pm.id === event.payload.power_mode_id);
                if (powerMode && onActivate) {
                    onActivate(powerMode);
                }
            }
        );

        const unlistenDeactivated = listen('power-mode-deactivated', async () => {
            const session = await powerModeApi.getSession();
            if (onDeactivate && session.original_state) {
                onDeactivate(session.original_state);
            }
        });

        return () => {
            unlistenActivated.then((fn) => fn());
            unlistenDeactivated.then((fn) => fn());
        };
    }, [powerModes, onActivate, onDeactivate]);

    return {
        checkNow: checkTrigger,
    };
};
