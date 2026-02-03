import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { Typography } from '@/components/typography';
import { Page } from '@/components/page';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft, CheckCircle2, HardDrive, Loader2 } from 'lucide-react';

interface StepOfflineDownloadProps {
    onComplete: () => void;
    onBack: () => void;
}

export const StepOfflineDownload = ({
    onComplete,
    onBack,
}: StepOfflineDownloadProps) => {
    const { t } = useTranslation();
    const [isModelAvailable, setIsModelAvailable] = useState<boolean | null>(null);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const checkModel = async () => {
            try {
                const available = await invoke<boolean>('is_model_available');
                setIsModelAvailable(available);
            } catch (error) {
                console.error('Failed to check model availability:', error);
                setIsModelAvailable(false);
            } finally {
                setIsChecking(false);
            }
        };
        checkModel();
    }, []);

    if (isChecking) {
        return (
            <div className="space-y-8">
                <div className="text-center space-y-2">
                    <Typography.MainTitle>
                        {t('Checking Offline Model')}
                    </Typography.MainTitle>
                    <Typography.Paragraph className="text-zinc-400">
                        {t('Verifying local model availability...')}
                    </Typography.Paragraph>
                </div>

                <div className="flex justify-center py-12">
                    <Loader2 className="w-12 h-12 text-sky-400 animate-spin" />
                </div>
            </div>
        );
    }

    if (isModelAvailable) {
        return (
            <div className="space-y-8">
                <div className="text-center space-y-2">
                    <Typography.MainTitle>
                        {t('Offline Model Ready')}
                    </Typography.MainTitle>
                    <Typography.Paragraph className="text-zinc-400">
                        {t(
                            'The Parakeet speech recognition model is installed and ready to use.'
                        )}
                    </Typography.Paragraph>
                </div>

                <div className="flex justify-center">
                    <div className="p-8 rounded-lg border border-green-500/30 bg-green-500/10">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-green-400" />
                            </div>
                            <div className="text-center">
                                <Typography.Title className="text-green-300">
                                    {t('Parakeet Model')}
                                </Typography.Title>
                                <Typography.Paragraph className="text-zinc-400 text-sm">
                                    {t('Local speech recognition • 25 European languages')}
                                </Typography.Paragraph>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <div className="flex gap-3">
                        <HardDrive className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <Typography.Title className="text-green-300 text-sm">
                                {t('Complete Privacy')}
                            </Typography.Title>
                            <Typography.Paragraph className="text-green-200/80 text-sm">
                                {t(
                                    'All transcription happens locally on your device. No data is ever sent to external servers.'
                                )}
                            </Typography.Paragraph>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between pt-4">
                    <Page.SecondaryButton onClick={onBack} className="gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        {t('Back')}
                    </Page.SecondaryButton>
                    <Page.PrimaryButton onClick={onComplete} className="px-8">
                        {t('Continue')}
                    </Page.PrimaryButton>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="text-center space-y-2">
                <Typography.MainTitle>
                    {t('Offline Model Not Found')}
                </Typography.MainTitle>
                <Typography.Paragraph className="text-zinc-400">
                    {t(
                        'The local speech recognition model could not be found. Please reinstall the application or choose Cloud mode.'
                    )}
                </Typography.Paragraph>
            </div>

            <div className="flex justify-center">
                <div className="p-8 rounded-lg border border-orange-500/30 bg-orange-500/10">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center">
                            <HardDrive className="w-8 h-8 text-orange-400" />
                        </div>
                        <div className="text-center">
                            <Typography.Title className="text-orange-300">
                                {t('Model Missing')}
                            </Typography.Title>
                            <Typography.Paragraph className="text-zinc-400 text-sm">
                                {t(
                                    'The Parakeet model is not available on your system.'
                                )}
                            </Typography.Paragraph>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between pt-4">
                <Page.SecondaryButton onClick={onBack} className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    {t('Back')}
                </Page.SecondaryButton>
                <Page.PrimaryButton onClick={onComplete} className="px-8">
                    {t('Continue Anyway')}
                </Page.PrimaryButton>
            </div>
        </div>
    );
};
