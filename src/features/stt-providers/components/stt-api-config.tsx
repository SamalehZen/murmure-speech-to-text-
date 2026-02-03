import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { Input } from '@/components/input';
import { Typography } from '@/components/typography';
import { SettingsUI } from '@/components/settings-ui';
import { Page } from '@/components/page';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/select';
import { Alert } from '@/components/alert';
import { Eye, EyeOff, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { STTProvider, STTProviderConfig, STT_PROVIDER_LABELS } from '../stt-providers.types';

interface STTApiConfigProps {
    provider: STTProvider;
    config: STTProviderConfig;
    onSave: (config: STTProviderConfig) => void;
    onTestConnection: () => Promise<boolean>;
    onRefreshModels: () => Promise<string[]>;
    isLoading?: boolean;
}

export const STTApiConfig = ({
    provider,
    config,
    onSave,
    onTestConnection,
    onRefreshModels,
    isLoading,
}: STTApiConfigProps) => {
    const { t } = useTranslation();
    const [showApiKey, setShowApiKey] = useState(false);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>(
        'idle'
    );
    const [isFetchingModels, setIsFetchingModels] = useState(false);
    const [localApiKey, setLocalApiKey] = useState(config.api_key || '');

    useEffect(() => {
        setLocalApiKey(config.api_key || '');
    }, [config.api_key, provider]);

    const handleApiKeyBlur = () => {
        if (localApiKey !== config.api_key) {
            onSave({ ...config, api_key: localApiKey });
        }
    };

    const handleTestConnection = async () => {
        setTestStatus('testing');
        try {
            const result = await onTestConnection();
            setTestStatus(result ? 'success' : 'error');
            setTimeout(() => setTestStatus('idle'), 3000);
        } catch {
            setTestStatus('error');
            setTimeout(() => setTestStatus('idle'), 3000);
        }
    };

    const handleRefreshModels = async () => {
        setIsFetchingModels(true);
        try {
            const models = await onRefreshModels();
            if (models.length > 0) {
                onSave({ ...config, available_models: models });
            }
        } catch (error) {
            console.error('Failed to fetch models:', error);
        } finally {
            setIsFetchingModels(false);
        }
    };

    return (
        <div className="space-y-4 px-4 py-3">
            <Alert className="border-amber-500/30 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <div className="ml-2">
                    <p className="text-sm text-amber-200">
                        {t('stt_privacy_warning_cloud', {
                            provider: STT_PROVIDER_LABELS[provider],
                            defaultValue: `Audio will be sent to ${STT_PROVIDER_LABELS[provider]} servers for transcription. API keys are stored locally without encryption. Do not use with sensitive data.`,
                        })}
                    </p>
                </div>
            </Alert>

            <SettingsUI.Item>
                <SettingsUI.Description>
                    <Typography.Title>{t('API Key')}</Typography.Title>
                    <Typography.Paragraph>
                        {t('Enter your API key for')} {t(STT_PROVIDER_LABELS[provider])}
                    </Typography.Paragraph>
                </SettingsUI.Description>
                <div className="flex items-center gap-2">
                    <div className="relative w-[280px]">
                        <Input
                            type={showApiKey ? 'text' : 'password'}
                            value={localApiKey}
                            onChange={(e) => setLocalApiKey(e.target.value)}
                            onBlur={handleApiKeyBlur}
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
                        disabled={testStatus === 'testing' || !localApiKey}
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
            </SettingsUI.Item>

            <SettingsUI.Item>
                <SettingsUI.Description>
                    <Typography.Title>{t('Model')}</Typography.Title>
                    <Typography.Paragraph>{t('Select the model to use')}</Typography.Paragraph>
                </SettingsUI.Description>
                <div className="flex items-center gap-2">
                    <Select
                        value={config.model}
                        onValueChange={(value) => onSave({ ...config, model: value })}
                        disabled={isLoading || config.available_models.length === 0}
                    >
                        <SelectTrigger className="w-[280px]">
                            <SelectValue placeholder={t('Select a model')} />
                        </SelectTrigger>
                        <SelectContent>
                            {config.available_models.map((model) => (
                                <SelectItem key={model} value={model}>
                                    {model}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Page.SecondaryButton
                        onClick={handleRefreshModels}
                        size="sm"
                        disabled={isFetchingModels || !localApiKey}
                    >
                        <RefreshCw
                            className={`h-4 w-4 ${isFetchingModels ? 'animate-spin' : ''}`}
                        />
                    </Page.SecondaryButton>
                </div>
            </SettingsUI.Item>

            <SettingsUI.Item>
                <SettingsUI.Description>
                    <Typography.Title>{t('Base URL')}</Typography.Title>
                    <Typography.Paragraph>
                        {t('Custom API endpoint (advanced)')}
                    </Typography.Paragraph>
                </SettingsUI.Description>
                <Input
                    value={config.base_url}
                    onChange={(e) => onSave({ ...config, base_url: e.target.value })}
                    className="w-[280px]"
                    placeholder="https://api.example.com/v1"
                />
            </SettingsUI.Item>
        </div>
    );
};
