import { useTranslation } from '@/i18n';
import { Typography } from '@/components/typography';
import { Page } from '@/components/page';
import { CheckCircle2 } from 'lucide-react';

interface StepCompleteProps {
    onFinish: () => void;
}

export const StepComplete = ({ onFinish }: StepCompleteProps) => {
    const { t } = useTranslation();

    return (
        <div className="text-center space-y-8">
            <div className="flex justify-center">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-green-400" />
                </div>
            </div>

            <div className="space-y-4">
                <Typography.MainTitle>
                    {t("You're all set!")}
                </Typography.MainTitle>
                <Typography.Paragraph className="text-zinc-400 text-lg">
                    {t('Press the record shortcut anywhere to start transcribing.')}
                </Typography.Paragraph>
            </div>

            <Page.PrimaryButton onClick={onFinish} className="px-8">
                {t('Start using Murmure')}
            </Page.PrimaryButton>
        </div>
    );
};
