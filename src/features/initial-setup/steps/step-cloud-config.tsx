import { useState } from 'react';
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
import { Eye, EyeOff, ArrowLeft, AlertTriangle } from 'lucide-react';
import {
    CloudSttProvider,
    CLOUD_STT_PROVIDER_LABELS,
    CLOUD_STT_PROVIDER_MODELS,
    CLOUD_STT_PROVIDER_DEFAULT_MODEL,
} from '../initial-setup.types';

interface StepCloudConfigProps {
    onComplete: (provider: CloudSttProvider, apiKey: string, model: string) => void;
    onBack: () => void;
}

const PROVIDERS: CloudSttProvider[] = ['openai', 'groq', 'google'];

export const StepCloudConfig = ({ onComplete, onBack }: StepCloudConfigProps) => {
    const { t } = useTranslation();
    const [provider, setProvider] = useState<CloudSttProvider>('openai');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState(CLOUD_STT_PROVIDER_DEFAULT_MODEL.openai);
    const [showApiKey, setShowApiKey] = useState(false);

    const handleProviderChange = (newProvider: CloudSttProvider) => {
        setProvider(newProvider);
        setModel(CLOUD_STT_PROVIDER_DEFAULT_MODEL[newProvider]);
    };

    const handleContinue = () => {
        onComplete(provider, apiKey, model);
    };

    const isValid = apiKey.trim().length > 0;

    return (
        <div className="space-y-8">
            <div className="text-center space-y-2">
                <Typography.MainTitle>
                    {t('Configure Cloud STT')}
                </Typography.MainTitle>
                <Typography.Paragraph className="text-zinc-400">
                    {t('Set up your cloud speech-to-text provider.')}
                </Typography.Paragraph>
            </div>

            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <Typography.Title className="text-orange-300 text-sm">
                            {t('Privacy Notice')}
                        </Typography.Title>
                        <Typography.Paragraph className="text-orange-200/80 text-sm">
                            {t(
                                'Your voice recordings will be sent to external servers for transcription. API keys are stored locally without encryption.'
                            )}
                        </Typography.Paragraph>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <Typography.Title className="text-sm">
                        {t('Provider')}
                    </Typography.Title>
                    <Select
                        value={provider}
                        onValueChange={(v) =>
                            handleProviderChange(v as CloudSttProvider)
                        }
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {PROVIDERS.map((p) => (
                                <SelectItem key={p} value={p}>
                                    {CLOUD_STT_PROVIDER_LABELS[p]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Typography.Title className="text-sm">
                        {t('API Key')}
                    </Typography.Title>
                    <div className="relative">
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
                </div>

                <div className="space-y-2">
                    <Typography.Title className="text-sm">
                        {t('Model')}
                    </Typography.Title>
                    <Select value={model} onValueChange={setModel}>
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {CLOUD_STT_PROVIDER_MODELS[provider].map((m) => (
                                <SelectItem key={m} value={m}>
                                    {m}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex justify-between pt-4">
                <Page.SecondaryButton onClick={onBack} className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    {t('Back')}
                </Page.SecondaryButton>
                <Page.PrimaryButton
                    onClick={handleContinue}
                    disabled={!isValid}
                    className="px-8"
                >
                    {t('Continue')}
                </Page.PrimaryButton>
            </div>
        </div>
    );
};
