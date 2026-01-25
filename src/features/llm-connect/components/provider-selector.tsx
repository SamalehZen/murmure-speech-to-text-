import { useTranslation } from '@/i18n';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/select';
import { Typography } from '@/components/typography';
import { SettingsUI } from '@/components/settings-ui';
import { LLMProvider, PROVIDER_LABELS } from '../llm-connect.types';

interface ProviderSelectorProps {
    activeProvider: LLMProvider;
    onProviderChange: (provider: LLMProvider) => void;
    connectionStatus?: Record<LLMProvider, boolean>;
}

const PROVIDERS: LLMProvider[] = ['ollama', 'openai', 'anthropic', 'google', 'openrouter'];

export const ProviderSelector = ({
    activeProvider,
    onProviderChange,
    connectionStatus,
}: ProviderSelectorProps) => {
    const { t } = useTranslation();

    return (
        <SettingsUI.Item>
            <SettingsUI.Description>
                <Typography.Title>{t('LLM Provider')}</Typography.Title>
                <Typography.Paragraph>
                    {t('Select the LLM provider to use for text processing')}
                </Typography.Paragraph>
            </SettingsUI.Description>
            <div className="flex items-center gap-3">
                <Select
                    value={activeProvider}
                    onValueChange={(value) => onProviderChange(value as LLMProvider)}
                >
                    <SelectTrigger className="w-[200px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {PROVIDERS.map((provider) => (
                            <SelectItem key={provider} value={provider}>
                                <div className="flex items-center gap-2">
                                    {connectionStatus && (
                                        <span
                                            className={`h-2 w-2 rounded-full ${
                                                connectionStatus[provider]
                                                    ? 'bg-green-500'
                                                    : 'bg-zinc-500'
                                            }`}
                                        />
                                    )}
                                    {PROVIDER_LABELS[provider]}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </SettingsUI.Item>
    );
};
