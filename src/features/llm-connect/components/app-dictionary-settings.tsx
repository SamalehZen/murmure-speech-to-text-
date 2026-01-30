import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { Typography } from '@/components/typography';
import { SettingsUI } from '@/components/settings-ui';
import { Page } from '@/components/page';
import { Switch } from '@/components/switch';
import { AppDictionary, AppDictionarySettings } from '../llm-connect.types';
import { AppDictionaryEditor } from './app-dictionary-editor';
import { DEFAULT_APP_DICTIONARIES } from '../dictionaries.constants';
import {
    Plus,
    Pencil,
    Trash2,
    Download,
    Upload,
    BookOpen,
    RefreshCw,
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/select';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';

interface AppDictionarySettingsProps {
    currentDetectedApp?: string;
    onRefreshCurrentApp: () => void;
}

interface BackendAppDictionary {
    id: string;
    name: string;
    app_patterns: string[];
    terms: { spoken: string[]; written: string; context?: string }[];
    enabled: boolean;
}

interface BackendAppDictionarySettings {
    dictionaries: BackendAppDictionary[];
    app_dictionary_overrides: Record<string, string>;
}

const toFrontend = (backend: BackendAppDictionary): AppDictionary => ({
    id: backend.id,
    name: backend.name,
    appPatterns: backend.app_patterns,
    terms: backend.terms,
    enabled: backend.enabled,
});

const toBackend = (frontend: AppDictionary): BackendAppDictionary => ({
    id: frontend.id,
    name: frontend.name,
    app_patterns: frontend.appPatterns,
    terms: frontend.terms,
    enabled: frontend.enabled,
});

export const AppDictionarySettingsComponent = ({
    currentDetectedApp,
    onRefreshCurrentApp,
}: AppDictionarySettingsProps) => {
    const { t } = useTranslation();
    const [settings, setSettings] = useState<AppDictionarySettings>({
        dictionaries: [],
        appDictionaryOverrides: {},
    });
    const [editingDictionary, setEditingDictionary] = useState<AppDictionary | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const loadSettings = async () => {
        try {
            const result = await invoke<BackendAppDictionarySettings>('get_app_dictionaries');
            setSettings({
                dictionaries: result.dictionaries.map(toFrontend),
                appDictionaryOverrides: result.app_dictionary_overrides,
            });
        } catch (error) {
            console.error('Failed to load app dictionaries:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();

        const unlistenPromise = listen('app-dictionaries:updated', () => {
            loadSettings();
        });

        return () => {
            unlistenPromise.then((unlisten) => unlisten());
        };
    }, []);

    const handleSaveDictionaries = async (dictionaries: AppDictionary[]) => {
        try {
            await invoke('set_app_dictionaries', {
                dictionaries: dictionaries.map(toBackend),
            });
            setSettings({ ...settings, dictionaries });
        } catch (error) {
            console.error('Failed to save app dictionaries:', error);
        }
    };

    const handleAddDictionary = () => {
        setIsCreating(true);
        setEditingDictionary({
            id: `dict-${Date.now()}`,
            name: '',
            appPatterns: [],
            terms: [],
            enabled: true,
        });
    };

    const handleSaveDictionary = async (dictionary: AppDictionary) => {
        const newDictionaries = isCreating
            ? [...settings.dictionaries, dictionary]
            : settings.dictionaries.map((d) => (d.id === dictionary.id ? dictionary : d));

        await handleSaveDictionaries(newDictionaries);
        setEditingDictionary(null);
        setIsCreating(false);
    };

    const handleDeleteDictionary = async (id: string) => {
        const defaultIds = DEFAULT_APP_DICTIONARIES.map((d) => d.id);
        if (defaultIds.includes(id)) return;

        await handleSaveDictionaries(settings.dictionaries.filter((d) => d.id !== id));
    };

    const handleToggleDictionary = async (id: string, enabled: boolean) => {
        const newDictionaries = settings.dictionaries.map((d) =>
            d.id === id ? { ...d, enabled } : d
        );
        await handleSaveDictionaries(newDictionaries);
    };

    const handleLoadDefaults = async () => {
        const existingIds = new Set(settings.dictionaries.map((d) => d.id));
        const newDicts = DEFAULT_APP_DICTIONARIES.filter((d) => !existingIds.has(d.id));
        if (newDicts.length > 0) {
            await handleSaveDictionaries([...settings.dictionaries, ...newDicts]);
        }
    };

    const handleSetOverride = async (appName: string, dictionaryId: string) => {
        try {
            await invoke('set_app_dictionary_override', {
                appName,
                dictionaryId: dictionaryId === '__none__' ? null : dictionaryId,
            });
            const newOverrides = { ...settings.appDictionaryOverrides };
            if (dictionaryId === '__none__') {
                delete newOverrides[appName];
            } else {
                newOverrides[appName] = dictionaryId;
            }
            setSettings({ ...settings, appDictionaryOverrides: newOverrides });
        } catch (error) {
            console.error('Failed to set dictionary override:', error);
        }
    };

    const handleExport = async () => {
        try {
            const filePath = await save({
                title: t('Export App Dictionaries'),
                filters: [{ name: 'JSON', extensions: ['json'] }],
                defaultPath: 'app_dictionaries.json',
            });
            if (filePath) {
                await invoke('export_app_dictionaries', { filePath });
            }
        } catch (error) {
            console.error('Failed to export:', error);
        }
    };

    const handleImport = async () => {
        try {
            const filePath = await open({
                title: t('Import App Dictionaries'),
                filters: [{ name: 'JSON', extensions: ['json'] }],
                multiple: false,
            });
            if (filePath) {
                await invoke('import_app_dictionaries', { filePath });
            }
        } catch (error) {
            console.error('Failed to import:', error);
        }
    };

    const handleTestTerm = async (spoken: string, dictionaryId: string): Promise<string | null> => {
        try {
            return await invoke<string | null>('test_app_dictionary_term', { spoken, dictionaryId });
        } catch {
            return null;
        }
    };

    const allAppsFromDictionaries = settings.dictionaries.flatMap((d) => d.appPatterns);
    const allAppsWithOverrides = Object.keys(settings.appDictionaryOverrides);
    const uniqueApps = [...new Set([...allAppsFromDictionaries, ...allAppsWithOverrides])].sort();

    if (isLoading) {
        return (
            <SettingsUI.Container className="mb-6">
                <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-5 w-5 animate-spin text-zinc-500" />
                </div>
            </SettingsUI.Container>
        );
    }

    return (
        <SettingsUI.Container className="mb-6">
            <SettingsUI.Item>
                <SettingsUI.Description>
                    <Typography.Title>
                        <BookOpen className="h-4 w-4 inline-block mr-2" />
                        {t('App-Specific Dictionaries')}
                    </Typography.Title>
                    <Typography.Paragraph>
                        {t(
                            'Define custom vocabulary replacements that are applied based on the active application'
                        )}
                    </Typography.Paragraph>
                </SettingsUI.Description>
            </SettingsUI.Item>

            <SettingsUI.Separator />

            {currentDetectedApp && (
                <>
                    <div className="px-4 py-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <Typography.Title className="text-sm">
                                    {t('Current App')}
                                </Typography.Title>
                                <span className="text-zinc-400">{currentDetectedApp}</span>
                            </div>
                            <button
                                onClick={onRefreshCurrentApp}
                                className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
                            >
                                <RefreshCw className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    <SettingsUI.Separator />
                </>
            )}

            <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                    <Typography.Title>{t('Dictionaries')}</Typography.Title>
                    <div className="flex items-center gap-2">
                        {settings.dictionaries.length === 0 && (
                            <Page.SecondaryButton size="sm" onClick={handleLoadDefaults}>
                                {t('Load Defaults')}
                            </Page.SecondaryButton>
                        )}
                        <Page.SecondaryButton size="sm" onClick={handleImport}>
                            <Upload className="h-4 w-4 mr-1" />
                            {t('Import')}
                        </Page.SecondaryButton>
                        <Page.SecondaryButton size="sm" onClick={handleExport}>
                            <Download className="h-4 w-4 mr-1" />
                            {t('Export')}
                        </Page.SecondaryButton>
                        <Page.SecondaryButton size="sm" onClick={handleAddDictionary}>
                            <Plus className="h-4 w-4 mr-1" />
                            {t('Add')}
                        </Page.SecondaryButton>
                    </div>
                </div>

                <div className="space-y-2">
                    {settings.dictionaries.map((dictionary) => (
                        <div
                            key={dictionary.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border ${
                                dictionary.enabled
                                    ? 'bg-zinc-900/50 border-zinc-800'
                                    : 'bg-zinc-900/20 border-zinc-800/50 opacity-60'
                            }`}
                        >
                            <Switch
                                checked={dictionary.enabled}
                                onCheckedChange={(checked) =>
                                    handleToggleDictionary(dictionary.id, checked)
                                }
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-zinc-200">
                                        {dictionary.name}
                                    </span>
                                    <span className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                                        {dictionary.terms.length} {t('terms')}
                                    </span>
                                </div>
                                {dictionary.appPatterns.length > 0 && (
                                    <div className="text-xs text-zinc-500 mt-1 truncate">
                                        {dictionary.appPatterns.slice(0, 3).join(', ')}
                                        {dictionary.appPatterns.length > 3 &&
                                            ` +${dictionary.appPatterns.length - 3}`}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => {
                                        setIsCreating(false);
                                        setEditingDictionary(dictionary);
                                    }}
                                    className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                                {!DEFAULT_APP_DICTIONARIES.find((d) => d.id === dictionary.id) && (
                                    <button
                                        onClick={() => handleDeleteDictionary(dictionary.id)}
                                        className="p-1.5 text-zinc-400 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {settings.dictionaries.length === 0 && (
                        <div className="text-center py-8 text-zinc-500">
                            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>{t('No app dictionaries configured')}</p>
                            <p className="text-sm">
                                {t('Click "Load Defaults" to get started with pre-configured dictionaries')}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {uniqueApps.length > 0 && (
                <>
                    <SettingsUI.Separator />
                    <div className="px-4 py-3">
                        <Typography.Title className="mb-3">
                            {t('App Dictionary Overrides')}
                        </Typography.Title>
                        <Typography.Paragraph className="mb-4">
                            {t('Override the default dictionary for specific applications')}
                        </Typography.Paragraph>

                        <div className="space-y-2">
                            {uniqueApps.map((appName) => {
                                const currentDictionaryId =
                                    settings.appDictionaryOverrides[appName];
                                const defaultDict = settings.dictionaries.find((d) =>
                                    d.appPatterns.includes(appName)
                                );

                                return (
                                    <div
                                        key={appName}
                                        className="flex items-center gap-3 p-2 rounded-lg bg-zinc-900/30"
                                    >
                                        <span className="flex-1 text-sm text-zinc-300 truncate">
                                            {appName}
                                        </span>
                                        <Select
                                            value={currentDictionaryId || '__default__'}
                                            onValueChange={(value) =>
                                                handleSetOverride(
                                                    appName,
                                                    value === '__default__' ? '__none__' : value
                                                )
                                            }
                                        >
                                            <SelectTrigger className="w-[200px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__default__">
                                                    {defaultDict
                                                        ? `${defaultDict.name} (${t('default')})`
                                                        : t('No dictionary')}
                                                </SelectItem>
                                                <SelectItem value="__none__">
                                                    {t('Disabled')}
                                                </SelectItem>
                                                {settings.dictionaries
                                                    .filter((d) => d.enabled)
                                                    .map((dict) => (
                                                        <SelectItem key={dict.id} value={dict.id}>
                                                            {dict.name}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {editingDictionary && (
                <AppDictionaryEditor
                    dictionary={editingDictionary}
                    onSave={handleSaveDictionary}
                    onCancel={() => {
                        setEditingDictionary(null);
                        setIsCreating(false);
                    }}
                    onTestTerm={handleTestTerm}
                />
            )}
        </SettingsUI.Container>
    );
};
