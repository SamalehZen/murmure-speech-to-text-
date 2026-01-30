import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect, useCallback } from 'react';
import { StyleLearningSettings, StyleProfile } from '../llm-connect.types';

const defaultSettings: StyleLearningSettings = {
    enabled: false,
    profiles: {},
    minSamplesForLearning: 5,
    maxExamplesStored: 20,
    excludedApps: [],
};

export const useStyleLearning = () => {
    const [settings, setSettings] = useState<StyleLearningSettings>(defaultSettings);
    const [isLoading, setIsLoading] = useState(true);

    const loadSettings = useCallback(async () => {
        try {
            setIsLoading(true);
            const loadedSettings = await invoke<StyleLearningSettings>('get_style_learning_settings');
            setSettings(loadedSettings);
        } catch (error) {
            console.error('Failed to load style learning settings:', error);
            setSettings(defaultSettings);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const toggleEnabled = useCallback(async (enabled: boolean) => {
        try {
            await invoke('toggle_style_learning', { enabled });
            setSettings((prev) => ({ ...prev, enabled }));
        } catch (error) {
            console.error('Failed to toggle style learning:', error);
            throw error;
        }
    }, []);

    const getProfile = useCallback(async (appName: string): Promise<StyleProfile | null> => {
        try {
            const profile = await invoke<StyleProfile | null>('get_style_profile', { appName });
            return profile;
        } catch (error) {
            console.error('Failed to get style profile:', error);
            return null;
        }
    }, []);

    const resetProfile = useCallback(async (appName: string) => {
        try {
            await invoke('reset_style_profile', { appName });
            setSettings((prev) => {
                const newProfiles = { ...prev.profiles };
                delete newProfiles[appName];
                return { ...prev, profiles: newProfiles };
            });
        } catch (error) {
            console.error('Failed to reset style profile:', error);
            throw error;
        }
    }, []);

    const resetAllProfiles = useCallback(async () => {
        try {
            await invoke('reset_all_style_profiles');
            setSettings((prev) => ({ ...prev, profiles: {} }));
        } catch (error) {
            console.error('Failed to reset all style profiles:', error);
            throw error;
        }
    }, []);

    const toggleAppEnabled = useCallback(async (appName: string, enabled: boolean) => {
        try {
            await invoke('toggle_app_style_learning', { appName, enabled });
            setSettings((prev) => {
                const profile = prev.profiles[appName];
                if (profile) {
                    return {
                        ...prev,
                        profiles: {
                            ...prev.profiles,
                            [appName]: { ...profile, enabled },
                        },
                    };
                }
                return prev;
            });
        } catch (error) {
            console.error('Failed to toggle app style learning:', error);
            throw error;
        }
    }, []);

    const addExcludedApp = useCallback(async (appName: string) => {
        try {
            await invoke('add_excluded_app', { appName });
            setSettings((prev) => ({
                ...prev,
                excludedApps: [...prev.excludedApps, appName],
            }));
        } catch (error) {
            console.error('Failed to add excluded app:', error);
            throw error;
        }
    }, []);

    const removeExcludedApp = useCallback(async (appName: string) => {
        try {
            await invoke('remove_excluded_app', { appName });
            setSettings((prev) => ({
                ...prev,
                excludedApps: prev.excludedApps.filter((a) => a !== appName),
            }));
        } catch (error) {
            console.error('Failed to remove excluded app:', error);
            throw error;
        }
    }, []);

    const getStylePreview = useCallback(async (appName: string): Promise<string | null> => {
        try {
            const preview = await invoke<string | null>('get_style_preview', { appName });
            return preview;
        } catch (error) {
            console.error('Failed to get style preview:', error);
            return null;
        }
    }, []);

    const updateSettings = useCallback(async (newSettings: StyleLearningSettings) => {
        try {
            await invoke('set_style_learning_settings', { settings: newSettings });
            setSettings(newSettings);
        } catch (error) {
            console.error('Failed to update style learning settings:', error);
            throw error;
        }
    }, []);

    return {
        settings,
        isLoading,
        loadSettings,
        toggleEnabled,
        getProfile,
        resetProfile,
        resetAllProfiles,
        toggleAppEnabled,
        addExcludedApp,
        removeExcludedApp,
        getStylePreview,
        updateSettings,
        profiles: settings.profiles,
        enabled: settings.enabled,
        excludedApps: settings.excludedApps,
    };
};
