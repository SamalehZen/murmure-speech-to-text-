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
import { ArrowLeft, Eye, EyeOff, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import {
    STTProvider,
    STTProviderConfig,
    STT_PROVIDER_LABELS,
    STT_PROVIDER_BASE_URLS,
} from '@/features/stt-providers/stt-providers.types';
import { DEFAULT_STT_PROVIDERS } from '@/features/stt-providers/stt-providers.constants';

type CloudProvider = Exclude<STTProvider, 'offline'>;

const CLOUD_PROVIDERS: CloudProvider[] = ['openai', 'google', 'groq'];

interface StepCloudConfigProps {
    onComplete: () => void;
    onBack: () => void;
}

export const StepCloudConfig = ({ onComplete, onBack }: StepCloudConfigProps) => {
    const { t } = useTranslation();
    const [selectedProvider, setSelectedProvider] = useState<CloudProvider>('openai');
    const [apiKey, setApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setApiKey('');
        setTestStatus('idle');
    }, [selectedProvider]);

    const handleTestConnection = async () => {
        if (apiKey.length === 0) return;

        setTestStatus('testing');
        try {
            const config: STTProviderConfig = {
                ...DEFAULT_STT_PROVIDERS[selectedProvider],
                api_key: apiKey,
                base_url: STT_PROVIDER_BASE_URLS[selectedProvider],
            };

            await invoke('save_stt_provider_config', {
                provider: selectedProvider,
                config,
            });

            const result = await invoke<boolean>('test_stt_connection', {
                provider: selectedProvider,
            });

            setTestStatus(result ? 'success' : 'error');
            setTimeout(() => setTestStatus('idle'), 3000);
        } catch {
            setTestStatus('error');
            setTimeout(() => setTestStatus('idle'), 3000);
        }
    };

    const handleContinue = async () => {
        if (apiKey.length === 0) return;

        setIsSaving(true);
        try {
            const config: STTProviderConfig = {
                ...DEFAULT_STT_PROVIDERS[selectedProvider],
                api_key: apiKey,
                base_url: STT_PROVIDER_BASE_URLS[selectedProvider],
            };

            await invoke('save_stt_provider_config', {
                provider: selectedProvider,
                config,
            });

            await invoke('set_active_stt_provider', { provider: selectedProvider });

            onComplete();
        } catch (error) {
            console.error('Failed to save cloud config:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                    aria-label={t('Back')}
                >
                    <ArrowLeft className="w-5 h-5 text-zinc-400" />
                </button>
                <div>
                    <Typography.MainTitle>
                        {t('Configure Cloud Provider')}
                    </Typography.MainTitle>
                    <Typography.Paragraph className="text-zinc-400">
                        {t('Select a provider and enter your API key.')}
                    </Typography.Paragraph>
                </div>
            </div>

            <Alert className="border-amber-500/30 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <div className="ml-2">
                    <p className="text-sm text-amber-200">
                        {t('Audio will be sent to cloud servers for transcription. API keys are stored locally.')}
                    </p>
                </div>
            </Alert>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Typography.Title>{t('Provider')}</Typography.Title>
                    <Select
                        value={selectedProvider}
                        onValueChange={(value) => setSelectedProvider(value as CloudProvider)}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {CLOUD_PROVIDERS.map((provider) => (
                                <SelectItem key={provider} value={provider}>
                                    {t(STT_PROVIDER_LABELS[provider])}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Typography.Title>{t('API Key')}</Typography.Title>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Input
                                type={showApiKey ? 'text' : 'password'}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="sk-..."
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
                            >
                                {showApiKey ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
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
            </div>

            <div className="flex justify-end pt-4">
                <Page.PrimaryButton
                    onClick={handleContinue}
                    disabled={apiKey.length === 0 || isSaving}
                    className="px-8"
                >
                    {isSaving ? t('Saving...') : t('Continue')}
                </Page.PrimaryButton>
            </div>
        </div>
    );
};
