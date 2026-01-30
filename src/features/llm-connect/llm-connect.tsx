import { useTranslation } from '@/i18n';
import { useState, useEffect } from 'react';
import { useLLMConnect, LLMMode } from './hooks/use-llm-connect';
import { useTemplates } from './hooks/use-templates';
import { toast } from 'react-toastify';
import { getPresetLabel, getPromptByPreset } from './llm-connect.helpers';
import { LLMConnectOnboarding } from './onboarding/llm-connect-onboarding';
import { LLMHeader } from './components/llm-header';
import { ModeTabs } from './components/mode-tabs';
import { ModeContent } from './components/mode-content';
import { LLMAdvancedSettings } from './components/llm-advanced-settings';
import { ProviderSelector } from './components/provider-selector';
import { ApiKeyConfig } from './components/api-key-config';
import { AppDetectionSettings } from './components/app-detection-settings';
import { ToneSettings } from './components/tone-settings';
import { StyleLearningSettings } from './components/style-learning-settings';
import { AppDictionarySettingsComponent } from './components/app-dictionary-settings';
import { TemplateSettings } from './components/template-settings';
import { VoiceCommandSettings } from './components/voice-command-settings';
import { SettingsUI } from '@/components/settings-ui';
import { LLMProvider, ProviderConfig } from './llm-connect.types';

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
        activeProvider,
        providers,
        setActiveProvider,
        saveProviderConfig,
        fetchProviderModels,
        testProviderConnection,
        appDetectionEnabled,
        appRules,
        currentActiveWindow,
        toggleAppDetection,
        saveAppRules,
        refreshActiveWindow,
        testAppRule,
        tones,
        appToneOverrides,
        defaultToneId,
        saveTones,
        setAppToneOverride,
        setDefaultTone,
    } = useLLMConnect();

    const {
        settings: templateSettings,
        isLoaded: isTemplatesLoaded,
        refreshSettings: refreshTemplateSettings,
    } = useTemplates();

    const [showModelSelector, setShowModelSelector] = useState(false);

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

    const handleProviderChange = async (provider: LLMProvider) => {
        try {
            await setActiveProvider(provider);
            if (provider !== 'ollama' && !settings.onboarding_completed) {
                await updateSettings({ onboarding_completed: true });
            }
            toast.success(t('Provider changed'), { autoClose: 1500 });
        } catch {
            toast.error(t('Failed to change provider'));
        }
    };

    const handleSaveProviderConfig = async (config: ProviderConfig) => {
        try {
            await saveProviderConfig(activeProvider, config);
        } catch {
            toast.error(t('Failed to save provider config'));
        }
    };

    const handleTestProviderConnection = async (): Promise<boolean> => {
        try {
            const result = await testProviderConnection(activeProvider);
            if (result) {
                toast.success(t('Connection successful'), { autoClose: 1500 });
            } else {
                toast.error(t('Connection failed'));
            }
            return result;
        } catch (error) {
            toast.error(t('Connection failed') + ': ' + (error as Error).message);
            return false;
        }
    };

    const handleRefreshProviderModels = async (): Promise<string[]> => {
        try {
            const fetchedModels = await fetchProviderModels(activeProvider);
            toast.success(t('Models refreshed'), { autoClose: 1500 });
            return fetchedModels;
        } catch (error) {
            toast.error(t('Failed to fetch models') + ': ' + (error as Error).message);
            return [];
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

    if (!isSettingsLoaded || !settings.modes || settings.modes.length === 0) {
        return (
            <div className="p-8 text-center text-zinc-500">
                {t('Loading...')}
            </div>
        );
    }

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

    const isOllamaOnboardingNeeded = activeProvider === 'ollama' && !settings.onboarding_completed;

    if (isOllamaOnboardingNeeded) {
        return (
            <main>
                <div className="space-y-6">
                    <LLMHeader connectionStatus={connectionStatus} />
                    
                    <SettingsUI.Container className="mb-6">
                        <ProviderSelector
                            activeProvider={activeProvider}
                            onProviderChange={handleProviderChange}
                        />
                    </SettingsUI.Container>

                    <SettingsUI.Container>
                        <div className="p-4">
                            <h3 className="text-sm font-medium text-zinc-200 mb-4">
                                {t('Ollama Setup')}
                            </h3>
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
                        </div>
                    </SettingsUI.Container>
                </div>
            </main>
        );
    }

    const currentProviderConfig = providers[activeProvider] || {
        provider: activeProvider,
        api_key: undefined,
        base_url: '',
        model: '',
        available_models: [],
    };

    return (
        <main>
            <div className="space-y-6">
                <LLMHeader connectionStatus={connectionStatus} />

                <SettingsUI.Container className="mb-6">
                    <ProviderSelector
                        activeProvider={activeProvider}
                        onProviderChange={handleProviderChange}
                    />

                    {activeProvider !== 'ollama' && (
                        <>
                            <SettingsUI.Separator />
                            <div className="px-4 py-3">
                                <ApiKeyConfig
                                    provider={activeProvider}
                                    config={currentProviderConfig}
                                    onSave={handleSaveProviderConfig}
                                    onTestConnection={handleTestProviderConnection}
                                    onRefreshModels={handleRefreshProviderModels}
                                    isLoading={isLoading}
                                />
                            </div>
                        </>
                    )}
                </SettingsUI.Container>

                <VoiceCommandSettings />

                <AppDetectionSettings
                    enabled={appDetectionEnabled}
                    rules={appRules}
                    currentWindow={currentActiveWindow}
                    onToggle={toggleAppDetection}
                    onRulesChange={saveAppRules}
                    onRefreshWindow={refreshActiveWindow}
                    onTestRule={testAppRule}
                />

                {appDetectionEnabled && (
                    <>
                        <ToneSettings
                            tones={tones}
                            appToneOverrides={appToneOverrides}
                            defaultToneId={defaultToneId}
                            onTonesChange={saveTones}
                            onSetAppToneOverride={setAppToneOverride}
                            onSetDefaultTone={setDefaultTone}
                        />

                        <StyleLearningSettings />

                        <AppDictionarySettingsComponent
                            currentDetectedApp={currentActiveWindow?.detected_app}
                            onRefreshCurrentApp={refreshActiveWindow}
                        />

                        {isTemplatesLoaded && (
                            <TemplateSettings
                                settings={templateSettings}
                                onRefresh={refreshTemplateSettings}
                            />
                        )}
                    </>
                )}

                {activeProvider === 'ollama' && (
                    <>
                        <ModeTabs
                            modes={settings.modes}
                            activeModeIndex={activeModeIndex}
                            models={models}
                            updateSettings={updateSettings}
                        />

                        {activeMode && (
                            <>
                                <ModeContent
                                    activeMode={activeMode}
                                    activeModeIndex={activeModeIndex}
                                    modes={settings.modes}
                                    models={models}
                                    isLoading={isLoading}
                                    updateSettings={updateSettings}
                                    onRefreshModels={handleTestConnection}
                                />

                                <LLMAdvancedSettings
                                    url={settings.url}
                                    onUrlChange={(url) => updateSettings({ url })}
                                    onTestConnection={handleTestConnection}
                                    onInstallModel={() => setShowModelSelector(true)}
                                    onResetOnboarding={handleResetOnboarding}
                                />
                            </>
                        )}
                    </>
                )}
            </div>
        </main>
    );
};
