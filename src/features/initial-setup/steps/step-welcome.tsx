import { useTranslation } from '@/i18n';
import { Typography } from '@/components/typography';
import { Page } from '@/components/page';
import { Mic } from 'lucide-react';

interface StepWelcomeProps {
    onNext: () => void;
}

export const StepWelcome = ({ onNext }: StepWelcomeProps) => {
    const { t } = useTranslation();

    return (
        <div className="text-center space-y-8">
            <div className="flex justify-center">
                <div className="w-20 h-20 bg-sky-500/20 rounded-full flex items-center justify-center">
                    <Mic className="w-10 h-10 text-sky-400" />
                </div>
            </div>

            <div className="space-y-4">
                <Typography.MainTitle>
                    {t('Welcome to Murmure')}
                </Typography.MainTitle>
                <Typography.Paragraph className="text-zinc-400 text-lg">
                    {t(
                        'Transform your voice into text, anywhere on your computer.'
                    )}
                </Typography.Paragraph>
            </div>

            <Page.PrimaryButton onClick={onNext} className="px-8">
                {t('Get Started')}
            </Page.PrimaryButton>
        </div>
    );
};
