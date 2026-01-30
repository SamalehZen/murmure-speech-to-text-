import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useState, useEffect, useCallback } from 'react';
import { TemplateSettings, TextTemplate } from '../llm-connect.types';
import { DEFAULT_TEMPLATES } from '../templates.constants';

export const useTemplates = () => {
    const [settings, setSettings] = useState<TemplateSettings>({
        templates: [],
        enabled: true,
        triggerPrefix: 'template',
    });
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        const unlisten = listen<TemplateSettings>('templates-updated', (event) => {
            setSettings(event.payload);
        });

        return () => {
            unlisten.then((fn) => fn());
        };
    }, []);

    const loadSettings = async () => {
        try {
            const loadedSettings = await invoke<TemplateSettings>('get_template_settings');
            setSettings(loadedSettings);
            setIsLoaded(true);
        } catch (error) {
            console.error('Failed to load template settings:', error);
            setIsLoaded(true);
        }
    };

    const toggleEnabled = useCallback(async (enabled: boolean) => {
        try {
            await invoke('toggle_templates', { enabled });
            setSettings((prev) => ({ ...prev, enabled }));
        } catch (error) {
            console.error('Failed to toggle templates:', error);
            throw error;
        }
    }, []);

    const setTemplates = useCallback(async (templates: TextTemplate[]) => {
        try {
            await invoke('set_templates', { templates });
            setSettings((prev) => ({ ...prev, templates }));
        } catch (error) {
            console.error('Failed to set templates:', error);
            throw error;
        }
    }, []);

    const addTemplate = useCallback(async (template: TextTemplate) => {
        try {
            await invoke('add_template', { template });
            setSettings((prev) => ({
                ...prev,
                templates: [...prev.templates, template],
            }));
        } catch (error) {
            console.error('Failed to add template:', error);
            throw error;
        }
    }, []);

    const updateTemplate = useCallback(async (template: TextTemplate) => {
        try {
            await invoke('update_template', { template });
            setSettings((prev) => ({
                ...prev,
                templates: prev.templates.map((t) =>
                    t.id === template.id ? template : t
                ),
            }));
        } catch (error) {
            console.error('Failed to update template:', error);
            throw error;
        }
    }, []);

    const deleteTemplate = useCallback(async (templateId: string) => {
        try {
            await invoke('delete_template', { templateId });
            setSettings((prev) => ({
                ...prev,
                templates: prev.templates.filter((t) => t.id !== templateId),
            }));
        } catch (error) {
            console.error('Failed to delete template:', error);
            throw error;
        }
    }, []);

    const setTriggerPrefix = useCallback(async (prefix: string | undefined) => {
        try {
            await invoke('set_template_trigger_prefix', { prefix: prefix ?? null });
            setSettings((prev) => ({ ...prev, triggerPrefix: prefix }));
        } catch (error) {
            console.error('Failed to set trigger prefix:', error);
            throw error;
        }
    }, []);

    const exportTemplates = useCallback(async (): Promise<string> => {
        try {
            return await invoke<string>('export_templates');
        } catch (error) {
            console.error('Failed to export templates:', error);
            throw error;
        }
    }, []);

    const importTemplates = useCallback(
        async (jsonContent: string, replace: boolean = false) => {
            try {
                await invoke('import_templates', { jsonContent, replace });
                await loadSettings();
            } catch (error) {
                console.error('Failed to import templates:', error);
                throw error;
            }
        },
        []
    );

    const resetToDefaults = useCallback(async () => {
        try {
            await invoke('reset_templates_to_default');
            setSettings((prev) => ({ ...prev, templates: DEFAULT_TEMPLATES }));
        } catch (error) {
            console.error('Failed to reset templates:', error);
            throw error;
        }
    }, []);

    const getTemplatesForApp = useCallback(
        async (detectedApp: string): Promise<TextTemplate[]> => {
            try {
                return await invoke<TextTemplate[]>('get_templates_for_app', {
                    detectedApp,
                });
            } catch (error) {
                console.error('Failed to get templates for app:', error);
                return [];
            }
        },
        []
    );

    return {
        settings,
        isLoaded,
        templates: settings.templates.length > 0 ? settings.templates : DEFAULT_TEMPLATES,
        enabled: settings.enabled,
        triggerPrefix: settings.triggerPrefix,
        toggleEnabled,
        setTemplates,
        addTemplate,
        updateTemplate,
        deleteTemplate,
        setTriggerPrefix,
        exportTemplates,
        importTemplates,
        resetToDefaults,
        getTemplatesForApp,
        refreshSettings: loadSettings,
    };
};
