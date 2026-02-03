import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/i18n';
import { Typography } from '@/components/typography';
import { Page } from '@/components/page';
import { ArrowLeft, Download, HardDrive, CheckCircle2, Lock } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { DownloadProgress } from '@/features/stt-providers/stt-providers.types';

interface StepOfflineDownloadProps {
    onComplete: () => void;
    onBack: () => void;
}

export const StepOfflineDownload = ({ onComplete, onBack }: StepOfflineDownloadProps) => {
    const { t } = useTranslation();
    const [isModelAvailable, setIsModelAvailable] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
    const [isChecking, setIsChecking] = useState(true);

    const checkModelAvailability = useCallback(async () => {
        try {
            const available = await invoke<boolean>('is_offline_model_available');
            setIsModelAvailable(available);
        } catch (error) {
            console.error('Failed to check model availability:', error);
            setIsModelAvailable(false);
        } finally {
            setIsChecking(false);
        }
    }, []);

    useEffect(() => {
        checkModelAvailability();

        const unlisten = listen<DownloadProgress>('model-download-progress', (event) => {
            setDownloadProgress(event.payload);
            if (event.payload.status === 'complete') {
                checkModelAvailability();
            }
        });

        return () => {
            unlisten.then((fn) => fn());
        };
    }, [checkModelAvailability]);

    const handleDownload = async () => {
        setDownloadProgress({
            downloaded: 0,
            total: 0,
            percentage: 0,
            status: 'downloading',
        });
        try {
            await invoke('download_offline_model');
        } catch (error) {
            console.error('Failed to download offline model:', error);
            setDownloadProgress(null);
        }
    };

    const handleContinue = async () => {
        try {
            await invoke('set_active_stt_provider', { provider: 'offline' });
            onComplete();
        } catch (error) {
            console.error('Failed to set offline provider:', error);
        }
    };

    const handleSkip = async () => {
        try {
            await invoke('set_active_stt_provider', { provider: 'offline' });
            onComplete();
        } catch (error) {
            console.error('Failed to set offline provider:', error);
        }
    };

    const isDownloading =
        downloadProgress?.status === 'downloading' ||
        downloadProgress?.status === 'extracting';

    if (isChecking) {
        return (
            <div className="text-center py-8">
                <Typography.Paragraph className="text-zinc-400">
                    {t('Checking model status...')}
                </Typography.Paragraph>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    disabled={isDownloading}
                    className="p-2 rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={t('Back')}
                >
                    <ArrowLeft className="w-5 h-5 text-zinc-400" />
                </button>
                <div>
                    <Typography.MainTitle>
                        {t('Download Offline Model')}
                    </Typography.MainTitle>
                    <Typography.Paragraph className="text-zinc-400">
                        {t('Download the Parakeet model for offline transcription.')}
                    </Typography.Paragraph>
                </div>
            </div>

            <div className="rounded-lg border border-zinc-700 p-6 space-y-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <HardDrive className="w-6 h-6 text-green-400" />
                    </div>
                    <div className="flex-1">
                        <Typography.Title>{t('Parakeet Model')}</Typography.Title>
                        <Typography.Paragraph className="text-zinc-400">
                            {t('Local speech recognition model (~400 MB)')}
                        </Typography.Paragraph>
                    </div>
                    {isModelAvailable ? (
                        <span className="text-green-500 flex items-center gap-1 text-sm">
                            <CheckCircle2 className="h-4 w-4" />
                            {t('Installed')}
                        </span>
                    ) : (
                        !isDownloading && (
                            <Page.PrimaryButton onClick={handleDownload}>
                                <Download className="h-4 w-4 mr-2" />
                                {t('Download')}
                            </Page.PrimaryButton>
                        )
                    )}
                </div>

                {isDownloading && downloadProgress !== null && (
                    <div className="space-y-2">
                        <div className="w-full bg-zinc-700 rounded-full h-2">
                            <div
                                className="bg-sky-500 h-2 rounded-full transition-all"
                                style={{ width: `${downloadProgress.percentage}%` }}
                            />
                        </div>
                        <Typography.Paragraph className="text-sm text-zinc-400">
                            {downloadProgress.status === 'extracting'
                                ? t('Extracting...')
                                : `${t('Downloading...')} ${downloadProgress.percentage.toFixed(0)}%`}
                        </Typography.Paragraph>
                    </div>
                )}

                <div className="rounded-md border border-green-500/30 bg-green-900/20 p-3 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <Typography.Paragraph className="text-green-300 text-sm">
                        {t('All processing happens locally. No data leaves your computer.')}
                    </Typography.Paragraph>
                </div>
            </div>

            <div className="flex justify-between pt-4">
                {!isModelAvailable && !isDownloading && (
                    <Page.SecondaryButton onClick={handleSkip}>
                        {t('Skip for now')}
                    </Page.SecondaryButton>
                )}
                <div className="flex-1" />
                {isModelAvailable && (
                    <Page.PrimaryButton onClick={handleContinue} className="px-8">
                        {t('Continue')}
                    </Page.PrimaryButton>
                )}
            </div>
        </div>
    );
};
