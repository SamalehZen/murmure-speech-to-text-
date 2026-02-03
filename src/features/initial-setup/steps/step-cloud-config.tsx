import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { Typography } from '@/components/typography';
import { Page } from '@/components/page';
import { Input } from '@/components/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/select';
import { Alert } from '@/components/alert';
import {
    Eye,
    EyeOff,
    RefreshCw,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ArrowLeft,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import {
    STTProvider,
    STTProviderConfig,
    STT_PROVIDER_LABELS,
    STT_PROVIDER_BASE_URLS,
} from '@/features/stt-providers/stt-providers.types';
import { DEFAULT_STT_PROVIDERS } from '@/features/stt-providers/stt-providers.constants';

interface StepCloudConfigProps {
    onComplete: () => void;
    onBack: () => void;
}

type CloudProvider = Exclude<STTProvider, 'offline'>;

const CLOUD_PROVIDERS: CloudProvider[] = ['openai', 'google', 'groq'];

export const StepCloudConfig = ({ onComplete, onBack }: StepCloudConfigProps) => {
    const { t } = useTranslation();
    const [selectedProvider, setSelectedProvider] = useState<CloudProvider>('openai');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState(DEFAULT_STT_PROVIDERS.openai.model);
    const [availableModels, setAvailableModels] = useState<string[]>(
        DEFAULT_STT_PROVIDERS.openai.available_models
    );
    const [showApiKey, setShowApiKey] = useState(false);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [isFetchingModels, setIsFetchingModels] = useState(false);

    useEffect(() => {
        const providerDefaults = DEFAULT_STT_PROVIDERS[selectedProvider];
        setModel(providerDefaults.model);
        setAvailableModels(providerDefaults.available_models);
        setApiKey('');
        setTestStatus('idle');
    }, [selectedProvider]);

    const handleTestConnection = async () => {
        setTestStatus('testing');
        try {
            const config: STTProviderConfig = {
                provider: selectedProvider,
                api_key: apiKey,
                base_url: STT_PROVIDER_BASE_URLS[selectedProvider],
                model,
                available_models: availableModels,
            };
            await invoke('save_stt_provider_config', { provider: selectedProvider, config });
            const result = await invoke<boolean>('test_stt_connection', { provider: selectedProvider });
            setTestStatus(result ? 'success' : 'error');
        } catch {
            setTestStatus('error');
        }
    };

    const handleRefreshModels = async () => {
        setIsFetchingModels(true);
        try {
            const config: STTProviderConfig = {
                provider: selectedProvider,
                api_key: apiKey,
                base_url: STT_PROVIDER_BASE_URLS[selectedProvider],
                model,
                available_models: availableModels,
            };
            await invoke('save_stt_provider_config', { provider: selectedProvider, config });
            const models = await invoke<string[]>('fetch_stt_models', { provider: selectedProvider });
            if (models.length > 0) {
                setAvailableModels(models);
            }
        } catch (error) {
            console.error('Failed to fetch models:', error);
        } finally {
            setIsFetchingModels(false);
        }
    };

    const handleContinue = async () => {
        try {
            const config: STTProviderConfig = {
                provider: selectedProvider,
                api_key: apiKey,
                base_url: STT_PROVIDER_BASE_URLS[selectedProvider],
                model,
                available_models: availableModels,
            };
            await invoke('save_stt_provider_config', { provider: selectedProvider, config });
            await invoke('set_active_stt_provider', { provider: selectedProvider });
            onComplete();
        } catch (error) {
            console.error('Failed to save config:', error);
        }
    };

    const isConfigValid = apiKey.length > 0 && testStatus === 'success';

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-zinc-400" />
                </button>
                <div>
                    <Typography.MainTitle>{t('Configure Cloud Provider')}</Typography.MainTitle>
                    <Typography.Paragraph className="text-zinc-400">
                        {t('Set up your preferred cloud transcription service.')}
                    </Typography.Paragraph>
                </div>
            </div>

            <Alert className="border-amber-500/30 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <div className="ml-2">
                    <p className="text-sm text-amber-200">
                        {t('stt_privacy_warning_cloud', {
                            provider: STT_PROVIDER_LABELS[selectedProvider],
                            defaultValue: `Audio will be sent to ${STT_PROVIDER_LABELS[selectedProvider]} servers for transcription. API keys are stored locally without encryption. Do not use with sensitive data.`,
                        })}
                    </p>
                </div>
            </Alert>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Typography.Title>{t('Provider')}</Typography.Title>
                    <div className="flex gap-2">
                        {CLOUD_PROVIDERS.map((provider) => (
                            <button
                                key={provider}
                                onClick={() => setSelectedProvider(provider)}
                                className={`px-4 py-2 rounded-lg border transition-all ${
                                    selectedProvider === provider
                                        ? 'border-sky-500 bg-sky-500/20 text-white'
                                        : 'border-zinc-700 hover:border-zinc-600 text-zinc-400'
                                }`}
                            >
                                {STT_PROVIDER_LABELS[provider]}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <Typography.Title>{t('API Key')}</Typography.Title>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Input
                                type={showApiKey ? 'text' : 'password'}
                                value={apiKey}
                                onChange={(e) => {
                                    setApiKey(e.target.value);
                                    setTestStatus('idle');
                                }}
                                placeholder="sk-..."
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
                            >
                                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <Page.SecondaryButton
                            onClick={handleTestConnection}
                            size="sm"
                            disabled={testStatus === 'testing' || apiKey.length === 0}
                        >
                            {testStatus === 'testing' ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : testStatus === 'success' ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : testStatus === 'error' ? (
                                <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                                t('Test')
                            )}
                        </Page.SecondaryButton>
                    </div>
                </div>

                <div className="space-y-2">
                    <Typography.Title>{t('Model')}</Typography.Title>
                    <div className="flex items-center gap-2">
                        <Select
                            value={model}
                            onValueChange={setModel}
                            disabled={availableModels.length === 0}
                        >
                            <SelectTrigger className="flex-1">
                                <SelectValue placeholder={t('Select a model')} />
                            </SelectTrigger>
                            <SelectContent>
                                {availableModels.map((m) => (
                                    <SelectItem key={m} value={m}>
                                        {m}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Page.SecondaryButton
                            onClick={handleRefreshModels}
                            size="sm"
                            disabled={isFetchingModels || apiKey.length === 0}
                        >
                            <RefreshCw className={`h-4 w-4 ${isFetchingModels ? 'animate-spin' : ''}`} />
                        </Page.SecondaryButton>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Page.PrimaryButton onClick={handleContinue} disabled={!isConfigValid}>
                    {t('Continue')}
                </Page.PrimaryButton>
            </div>
        </div>
    );
};
