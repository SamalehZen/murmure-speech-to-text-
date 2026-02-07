import { useTranslation } from '@/i18n';
import { useState, useEffect } from 'react';
import { useLLMConnect, LLMMode } from './hooks/use-llm-connect';
import { useTones, TonesSettings } from '@/features/tones';
import { toast } from 'react-toastify';
import { getPresetLabel, getPromptByPreset } from './llm-connect.helpers';
import { LLMConnectOnboarding } from './onboarding/llm-connect-onboarding';
import { LLMHeader } from './components/llm-header';
import { ModeTabs } from './components/mode-tabs';
import { ModeContent } from './components/mode-content';
import { LLMAdvancedSettings } from './components/llm-advanced-settings';

export const LLMConnect = () => {
    const { t, i18n } = useTranslation();
    const {
        settings,
        models,
        connectionStatus,
        isLoading,
        isSettingsLoaded,
        updateSettings,
        testConnection,
        fetchModels,
        pullModel,
    } = useLLMConnect();

    const {
        settings: tonesSettings,
        isLoading: isTonesLoading,
        addTone,
        updateTone,
        deleteTone,
        addRegisteredApp,
        updateRegisteredApp,
        deleteRegisteredApp,
        setDefaultTone,
    } = useTones();

    const [showModelSelector, setShowModelSelector] = useState(false);
    const [activeTab, setActiveTab] = useState<'modes' | 'tones'>('tones');

    const activeModeIndex = settings.active_mode_index;
    const activeMode = settings.modes[activeModeIndex];

    const handleTestConnection = async () => {
        const result = await testConnection();
        if (result) {
            toast.success(t('Connection successful'), { autoClose: 1500 });
            await fetchModels();
        } else {
            toast.error(t('Connection failed'));
        }
    };

    const buildDefaultMode = (modelName: string): LLMMode => ({
        name: t(getPresetLabel('general')),
        prompt: getPromptByPreset('general', i18n.language),
        model: modelName,
        shortcut: 'Ctrl + Shift + 1',
    });

    const handleResetOnboarding = async () => {
        try {
            await updateSettings({
                onboarding_completed: false,
                model: '',
                prompt: '',
                modes: [buildDefaultMode('')],
                active_mode_index: 0,
            });
        } catch {
            toast.error(t('Failed to reset onboarding'));
        }
    };

    useEffect(() => {
        if (
            isSettingsLoaded &&
            !settings.onboarding_completed &&
            !showModelSelector &&
            settings.model === ''
        ) {
            const defaultMode = buildDefaultMode('');
            const hasOneMode = settings.modes.length === 1;
            const isDefaultMode =
                hasOneMode &&
                settings.active_mode_index === 0 &&
                settings.modes[0]?.name === defaultMode.name &&
                settings.modes[0]?.prompt === defaultMode.prompt &&
                settings.modes[0]?.model === '' &&
                settings.modes[0]?.shortcut === defaultMode.shortcut;

            if (!isDefaultMode) {
                updateSettings({
                    model: '',
                    prompt: '',
                    modes: [defaultMode],
                    active_mode_index: 0,
                });
            }
        }
    }, [
        isSettingsLoaded,
        settings.onboarding_completed,
        settings.model,
        settings.modes,
        settings.active_mode_index,
        showModelSelector,
        i18n.language,
        updateSettings,
        t,
    ]);

    if (!isSettingsLoaded || !settings.modes || settings.modes.length === 0 || isTonesLoading) {
        return (
            <div className="p-8 text-center text-zinc-500">
                {t('Loading...')}
            </div>
        );
    }

    // Install another model flow (preserves existing configuration)
    if (showModelSelector) {
        return (
            <main>
                <LLMConnectOnboarding
                    settings={settings}
                    testConnection={testConnection}
                    pullModel={pullModel}
                    updateSettings={updateSettings}
                    models={models}
                    fetchModels={fetchModels}
                    isInstallOnly={true}
                    completeOnboarding={async () => {
                        await fetchModels();
                        setShowModelSelector(false);
                    }}
                />
            </main>
        );
    }

    // First-time setup onboarding flow
    if (!settings.onboarding_completed) {
        return (
            <main>
                <LLMConnectOnboarding
                    settings={settings}
                    testConnection={testConnection}
                    pullModel={pullModel}
                    updateSettings={updateSettings}
                    models={models}
                    fetchModels={fetchModels}
                    completeOnboarding={async () => {
                        await fetchModels();
                        await updateSettings({ onboarding_completed: true });
                    }}
                />
            </main>
        );
    }

    return (
        <main>
            <div className="space-y-6">
                <LLMHeader connectionStatus={connectionStatus} />

                <div className="flex border-b border-zinc-700 mb-4">
                    <button
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === 'tones'
                                ? 'text-sky-400 border-b-2 border-sky-500'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                        onClick={() => setActiveTab('tones')}
                    >
                        {t('Context-Aware Tones')}
                    </button>
                    <button
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === 'modes'
                                ? 'text-sky-400 border-b-2 border-sky-500'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                        onClick={() => setActiveTab('modes')}
                    >
                        {t('Legacy Modes')}
                    </button>
                </div>

                {activeTab === 'tones' && (
                    <TonesSettings
                        tones={tonesSettings.tones}
                        registeredApps={tonesSettings.registered_apps}
                        defaultToneId={tonesSettings.default_tone_id}
                        models={models}
                        onAddTone={addTone}
                        onUpdateTone={updateTone}
                        onDeleteTone={deleteTone}
                        onAddRegisteredApp={addRegisteredApp}
                        onUpdateRegisteredApp={updateRegisteredApp}
                        onDeleteRegisteredApp={deleteRegisteredApp}
                        onSetDefaultTone={setDefaultTone}
                    />
                )}

                {activeTab === 'modes' && (
                    <>
                        <div className="p-3 bg-amber-900/30 border border-amber-700 rounded-lg text-amber-200 text-sm mb-4">
                            {t('Legacy modes are being replaced by context-aware tones. Your existing modes have been migrated.')}
                        </div>
                        <ModeTabs
                            modes={settings.modes}
                            activeModeIndex={activeModeIndex}
                            models={models}
                            updateSettings={updateSettings}
                        />

                        {activeMode && (
                            <ModeContent
                                activeMode={activeMode}
                                activeModeIndex={activeModeIndex}
                                modes={settings.modes}
                                models={models}
                                isLoading={isLoading}
                                updateSettings={updateSettings}
                                onRefreshModels={handleTestConnection}
                            />
                        )}
                    </>
                )}

                <LLMAdvancedSettings
                    url={settings.url}
                    onUrlChange={(url) => updateSettings({ url })}
                    onTestConnection={handleTestConnection}
                    onInstallModel={() => setShowModelSelector(true)}
                    onResetOnboarding={handleResetOnboarding}
                />
            </div>
        </main>
    );
};
