import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect, useCallback } from 'react';
import type {
    CloudAuthState,
    CloudUser,
    GlobalConfig,
    SyncStatus,
} from '../cloud-sync.types';

export function useCloudSync() {
    const [authState, setAuthState] = useState<CloudAuthState>({
        is_authenticated: false,
    });
    const [syncStatus, setSyncStatus] = useState<SyncStatus>({
        is_syncing: false,
    });
    const [cachedConfig, setCachedConfig] = useState<GlobalConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadInitialState = useCallback(async () => {
        try {
            setIsLoading(true);
            const [auth, status, config] = await Promise.all([
                invoke<CloudAuthState>('cloud_get_auth_state'),
                invoke<SyncStatus>('cloud_get_sync_status'),
                invoke<GlobalConfig | null>('cloud_get_cached_config'),
            ]);
            setAuthState(auth);
            setSyncStatus(status);
            setCachedConfig(config);
        } catch (err) {
            console.error('Failed to load cloud sync state:', err);
            setError(String(err));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadInitialState();
    }, [loadInitialState]);

    const login = useCallback(
        async (backendUrl: string, email: string, password: string): Promise<CloudUser> => {
            setIsLoading(true);
            setError(null);
            try {
                const user = await invoke<CloudUser>('cloud_login', {
                    backendUrl,
                    email,
                    password,
                });
                setAuthState({
                    is_authenticated: true,
                    user,
                    backend_url: backendUrl,
                });
                return user;
            } catch (err) {
                const errorMessage = String(err);
                setError(errorMessage);
                throw new Error(errorMessage);
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    const loginWithToken = useCallback(
        async (backendUrl: string, token: string): Promise<CloudUser> => {
            setIsLoading(true);
            setError(null);
            try {
                const user = await invoke<CloudUser>('cloud_login_with_token', {
                    backendUrl,
                    token,
                });
                setAuthState({
                    is_authenticated: true,
                    user,
                    token,
                    backend_url: backendUrl,
                });
                return user;
            } catch (err) {
                const errorMessage = String(err);
                setError(errorMessage);
                throw new Error(errorMessage);
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    const logout = useCallback(async () => {
        setIsLoading(true);
        try {
            await invoke('cloud_logout');
            setAuthState({ is_authenticated: false });
            setCachedConfig(null);
            setSyncStatus({ is_syncing: false });
        } catch (err) {
            console.error('Logout failed:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const syncConfig = useCallback(async (): Promise<GlobalConfig> => {
        setSyncStatus((prev) => ({ ...prev, is_syncing: true, error: undefined }));
        try {
            const config = await invoke<GlobalConfig>('cloud_sync_config');
            setCachedConfig(config);
            setSyncStatus({
                is_syncing: false,
                last_sync: new Date().toISOString(),
            });
            return config;
        } catch (err) {
            const errorMessage = String(err);
            setSyncStatus((prev) => ({
                ...prev,
                is_syncing: false,
                error: errorMessage,
            }));
            throw new Error(errorMessage);
        }
    }, []);

    const syncIfNeeded = useCallback(async (): Promise<GlobalConfig | null> => {
        try {
            const config = await invoke<GlobalConfig | null>('cloud_sync_if_needed');
            if (config) {
                setCachedConfig(config);
            }
            const status = await invoke<SyncStatus>('cloud_get_sync_status');
            setSyncStatus(status);
            return config;
        } catch (err) {
            console.error('Sync if needed failed:', err);
            return cachedConfig;
        }
    }, [cachedConfig]);

    const applyDictionary = useCallback(async (): Promise<void> => {
        try {
            await invoke('cloud_apply_dictionary');
        } catch (err) {
            console.error('Apply dictionary failed:', err);
            throw new Error(String(err));
        }
    }, []);

    return {
        authState,
        syncStatus,
        cachedConfig,
        isLoading,
        error,
        login,
        loginWithToken,
        logout,
        syncConfig,
        syncIfNeeded,
        applyDictionary,
        refresh: loadInitialState,
    };
}
