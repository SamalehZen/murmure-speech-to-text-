import { useTranslation } from '@/i18n';
import { Page } from '@/components/page';
import { Typography } from '@/components/typography';
import { SettingsUI } from '@/components/settings-ui';
import { useSTTProviders } from './hooks/use-stt-providers';
import { STTProviderSelector } from './components/stt-provider-selector';
import { OfflineModelCard } from './components/offline-model-card';
import { STTApiConfig } from './components/stt-api-config';
import { toast } from 'react-toastify';

export const STTProviders = () => {
    const { t } = useTranslation();
    const {
        settings,
        isLoading,
        isModelAvailable,
        downloadProgress,
        modelSize,
        setActiveProvider,
        saveProviderConfig,
        testConnection,
        fetchModels,
        downloadModel,
        deleteModel,
    } = useSTTProviders();

    if (isLoading || settings === null) {
        return <div className="p-8 text-center text-zinc-500">{t('Loading...')}</div>;
    }

    const activeProvider = settings.active_provider;
    const currentConfig = settings.providers[activeProvider];

    const handleProviderChange = async (provider: typeof activeProvider) => {
        try {
            await setActiveProvider(provider);
            toast.success(t('Provider changed'), { autoClose: 1500 });
        } catch {
            toast.error(t('Failed to change provider'));
        }
    };

    const handleSaveConfig = async (config: typeof currentConfig) => {
        try {
            await saveProviderConfig(activeProvider, config);
        } catch {
            toast.error(t('Failed to save configuration'));
        }
    };

    const handleTestConnection = async (): Promise<boolean> => {
        try {
            const result = await testConnection(activeProvider);
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

    const handleRefreshModels = async (): Promise<string[]> => {
        try {
            const models = await fetchModels(activeProvider);
            toast.success(t('Models refreshed'), { autoClose: 1500 });
            return models;
        } catch (error) {
            toast.error(t('Failed to fetch models') + ': ' + (error as Error).message);
            return [];
        }
    };

    const handleDownload = async () => {
        try {
            await downloadModel();
        } catch {
            toast.error(t('Download failed'));
        }
    };

    const handleDelete = async () => {
        try {
            await deleteModel();
            toast.success(t('Model deleted'), { autoClose: 1500 });
        } catch {
            toast.error(t('Failed to delete model'));
        }
    };

    return (
        <main className="space-y-6">
            <Page.Header>
                <Typography.MainTitle>{t('Speech Recognition')}</Typography.MainTitle>
                <Typography.Paragraph className="text-zinc-400">
                    {t('Choose how Murmure transcribes your voice.')}
                </Typography.Paragraph>
            </Page.Header>

            <SettingsUI.Container>
                <STTProviderSelector
                    activeProvider={activeProvider}
                    onProviderChange={handleProviderChange}
                />
            </SettingsUI.Container>

            {activeProvider === 'offline' && (
                <OfflineModelCard
                    isAvailable={isModelAvailable}
                    downloadProgress={downloadProgress}
                    modelSize={modelSize}
                    onDownload={handleDownload}
                    onDelete={handleDelete}
                />
            )}

            {activeProvider !== 'offline' && currentConfig !== undefined && (
                <SettingsUI.Container>
                    <STTApiConfig
                        provider={activeProvider}
                        config={currentConfig}
                        onSave={handleSaveConfig}
                        onTestConnection={handleTestConnection}
                        onRefreshModels={handleRefreshModels}
                    />
                </SettingsUI.Container>
            )}
        </main>
    );
};
