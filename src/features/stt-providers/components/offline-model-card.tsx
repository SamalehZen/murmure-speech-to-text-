import { useTranslation } from '@/i18n';
import { SettingsUI } from '@/components/settings-ui';
import { Typography } from '@/components/typography';
import { Page } from '@/components/page';
import { Download, Trash2, CheckCircle2, HardDrive } from 'lucide-react';
import { DownloadProgress } from '../stt-providers.types';

interface OfflineModelCardProps {
    isAvailable: boolean;
    downloadProgress: DownloadProgress | null;
    modelSize: number | null;
    onDownload: () => void;
    onDelete: () => void;
}

export const OfflineModelCard = ({
    isAvailable,
    downloadProgress,
    modelSize,
    onDownload,
    onDelete,
}: OfflineModelCardProps) => {
    const { t } = useTranslation();

    const isDownloading =
        downloadProgress?.status === 'downloading' ||
        downloadProgress?.status === 'extracting';

    const formatSize = (bytes: number) => {
        return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
    };

    return (
        <SettingsUI.Container>
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <Typography.Title className="flex items-center gap-2">
                            <HardDrive className="h-4 w-4" />
                            {t('Parakeet Model')}
                        </Typography.Title>
                        <Typography.Paragraph className="text-zinc-400">
                            {t('Local speech recognition model (~400 MB)')}
                        </Typography.Paragraph>
                    </div>

                    {isAvailable ? (
                        <div className="flex items-center gap-2">
                            <span className="text-green-500 flex items-center gap-1 text-sm">
                                <CheckCircle2 className="h-4 w-4" />
                                {t('Installed')}
                                {modelSize !== null && ` (${formatSize(modelSize)})`}
                            </span>
                            <Page.SecondaryButton onClick={onDelete} size="sm">
                                <Trash2 className="h-4 w-4" />
                            </Page.SecondaryButton>
                        </div>
                    ) : (
                        <Page.PrimaryButton onClick={onDownload} disabled={isDownloading}>
                            <Download className="h-4 w-4 mr-2" />
                            {t('Download')}
                        </Page.PrimaryButton>
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

                <div className="rounded-md border border-green-500/30 bg-green-900/20 p-3">
                    <Typography.Paragraph className="text-green-300 text-sm">
                        {t('All processing happens locally. No data leaves your computer.')}
                    </Typography.Paragraph>
                </div>
            </div>
        </SettingsUI.Container>
    );
};
