import { useTranslation } from '@/i18n';
import { Alert } from '@/components/alert';
import { AlertTriangle } from 'lucide-react';
import { LLMProvider, PROVIDER_LABELS } from '../llm-connect.types';

interface PrivacyWarningProps {
    provider: LLMProvider;
}

export const PrivacyWarning = ({ provider }: PrivacyWarningProps) => {
    const { t } = useTranslation();

    if (provider === 'ollama') {
        return null;
    }

    return (
        <Alert className="border-amber-500/30 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <div className="ml-2">
                <p className="text-sm text-amber-200">
                    {t('privacy_warning_cloud', {
                        provider: PROVIDER_LABELS[provider],
                        defaultValue: `Les transcriptions seront envoyées aux serveurs de ${PROVIDER_LABELS[provider]}. Vos clés API sont stockées localement sans chiffrement. N'utilisez pas avec des données sensibles.`
                    })}
                </p>
            </div>
        </Alert>
    );
};
