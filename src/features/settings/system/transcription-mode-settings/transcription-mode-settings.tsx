import { SettingsUI } from '@/components/settings-ui';
import { Typography } from '@/components/typography';
import { Cloud, Wifi, WifiOff, Zap, Target, Check, AlertTriangle, FileKey, X } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useTranscriptionModeState } from './hooks/use-transcription-mode-state';
import {
    TranscriptionMode,
    TRANSCRIPTION_MODES,
} from './transcription-mode-settings.types';

export const TranscriptionModeSettings = () => {
    const { t } = useTranslation();
    const {
        mode,
        setMode,
        hasGoogleApiKey,
        hasGoogleCloudCredentials,
        credentialsPath,
        selectCredentialsFile,
        clearCredentialsFile,
        isLoading,
    } = useTranscriptionModeState();

    const handleModeChange = async (newMode: TranscriptionMode) => {
        const modeConfig = TRANSCRIPTION_MODES.find((m) => m.value === newMode);

        if (newMode === 'cloud_fast' && !hasGoogleApiKey) {
            return;
        }

        if (newMode === 'cloud_precision' && !hasGoogleCloudCredentials) {
            return;
        }

        await setMode(newMode);
    };

    const getIcon = (modeValue: TranscriptionMode) => {
        switch (modeValue) {
            case 'offline':
                return <WifiOff className="w-5 h-5" />;
            case 'cloud_fast':
                return <Zap className="w-5 h-5" />;
            case 'cloud_precision':
                return <Target className="w-5 h-5" />;
            default:
                return <Cloud className="w-5 h-5" />;
        }
    };

    const getFileName = (path: string | null): string => {
        if (path == null) return '';
        const parts = path.split(/[/\\]/);
        return parts[parts.length - 1] || path;
    };

    if (isLoading) {
        return (
            <SettingsUI.Item>
                <SettingsUI.Description>
                    <Typography.Title className="flex items-center gap-2">
                        <Wifi className="w-4 h-4 text-zinc-400" />
                        {t('Transcription mode')}
                    </Typography.Title>
                    <Typography.Paragraph>{t('Loading...')}</Typography.Paragraph>
                </SettingsUI.Description>
            </SettingsUI.Item>
        );
    }

    return (
        <>
            <SettingsUI.Item>
                <SettingsUI.Description>
                    <Typography.Title className="flex items-center gap-2">
                        <Wifi className="w-4 h-4 text-zinc-400" />
                        {t('Transcription mode')}
                    </Typography.Title>
                    <Typography.Paragraph>
                        {t('Choose how audio is transcribed and processed.')}
                    </Typography.Paragraph>
                </SettingsUI.Description>
            </SettingsUI.Item>

            <div className="px-4 pb-4 space-y-2">
                {TRANSCRIPTION_MODES.map((option) => {
                    const isDisabledFast = option.value === 'cloud_fast' && !hasGoogleApiKey;
                    const isDisabledPrecision = option.value === 'cloud_precision' && !hasGoogleCloudCredentials;
                    const isDisabled = isDisabledFast || isDisabledPrecision;
                    const isSelected = mode === option.value;

                    return (
                        <button
                            key={option.value}
                            onClick={() => handleModeChange(option.value)}
                            disabled={isDisabled}
                            className={`w-full p-3 rounded-lg border transition-all text-left ${
                                isSelected
                                    ? 'border-blue-500 bg-blue-500/10'
                                    : 'border-zinc-700 hover:border-zinc-600'
                            } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <div className="flex items-start gap-3">
                                <span
                                    className={`mt-0.5 ${isSelected ? 'text-blue-400' : 'text-zinc-500'}`}
                                >
                                    {getIcon(option.value)}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium text-zinc-200 text-sm">
                                            {t(option.label)}
                                        </span>
                                        <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded shrink-0">
                                            {option.latency}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-400 mt-1">
                                        {t(option.description)}
                                    </p>
                                    {isDisabledFast && (
                                        <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            {t('Requires Google API key in LLM Connect')}
                                        </p>
                                    )}
                                    {isDisabledPrecision && (
                                        <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            {t('Requires Google Cloud Service Account')}
                                        </p>
                                    )}
                                </div>
                                {isSelected && (
                                    <div className="text-blue-500 shrink-0">
                                        <Check className="w-4 h-4" />
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}

                <div className="mt-4 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <FileKey className="w-4 h-4 text-zinc-400" />
                        <span className="text-sm font-medium text-zinc-200">
                            {t('Google Cloud Service Account')}
                        </span>
                    </div>
                    <p className="text-xs text-zinc-400 mb-3">
                        {t('Required for Cloud Precision mode (Chirp 3). Download from Google Cloud Console.')}
                    </p>
                    
                    {credentialsPath != null ? (
                        <div className="flex items-center gap-2">
                            <div className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-600 rounded text-xs text-zinc-300 truncate">
                                {getFileName(credentialsPath)}
                            </div>
                            <button
                                onClick={clearCredentialsFile}
                                className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
                                title={t('Remove credentials')}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={selectCredentialsFile}
                            className="w-full px-3 py-2 bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 rounded text-xs text-zinc-200 transition-colors"
                        >
                            {t('Select JSON credentials file...')}
                        </button>
                    )}
                </div>

                {!hasGoogleApiKey && (
                    <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <p className="text-xs text-amber-400">
                            {t('Cloud Fast mode requires Google API key in LLM Connect settings.')}
                        </p>
                    </div>
                )}
            </div>
        </>
    );
};
