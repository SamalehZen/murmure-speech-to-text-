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
import { STTProvider, STT_PROVIDER_LABELS, STT_PROVIDERS } from '../stt-providers.types';

interface STTProviderSelectorProps {
    activeProvider: STTProvider;
    onProviderChange: (provider: STTProvider) => void;
}

export const STTProviderSelector = ({
    activeProvider,
    onProviderChange,
}: STTProviderSelectorProps) => {
    const { t } = useTranslation();

    return (
        <SettingsUI.Item>
            <SettingsUI.Description>
                <Typography.Title>{t('STT Provider')}</Typography.Title>
                <Typography.Paragraph>
                    {t('Select the speech-to-text provider')}
                </Typography.Paragraph>
            </SettingsUI.Description>
            <div className="flex items-center gap-3">
                <Select
                    value={activeProvider}
                    onValueChange={(value) => onProviderChange(value as STTProvider)}
                >
                    <SelectTrigger className="w-[200px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {STT_PROVIDERS.map((provider) => (
                            <SelectItem key={provider} value={provider}>
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`h-2 w-2 rounded-full ${
                                            provider === 'offline'
                                                ? 'bg-green-500'
                                                : 'bg-amber-500'
                                        }`}
                                    />
                                    {t(STT_PROVIDER_LABELS[provider])}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </SettingsUI.Item>
    );
};
