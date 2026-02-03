import { useTranslation } from '@/i18n';
import { Typography } from '@/components/typography';
import { Cloud, HardDrive, Shield, Zap, Globe, Lock } from 'lucide-react';

interface StepModeChoiceProps {
    onSelect: (mode: 'cloud' | 'offline') => void;
}

export const StepModeChoice = ({ onSelect }: StepModeChoiceProps) => {
    const { t } = useTranslation();

    return (
        <div className="space-y-8">
            <div className="text-center space-y-2">
                <Typography.MainTitle>
                    {t('How would you like to transcribe?')}
                </Typography.MainTitle>
                <Typography.Paragraph className="text-zinc-400">
                    {t('Choose the mode that best fits your needs.')}
                </Typography.Paragraph>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => onSelect('cloud')}
                    className="p-6 rounded-lg border border-zinc-700 hover:border-sky-500 hover:bg-sky-500/10 transition-all text-left space-y-4 group"
                >
                    <div className="w-12 h-12 bg-sky-500/20 rounded-lg flex items-center justify-center group-hover:bg-sky-500/30">
                        <Cloud className="w-6 h-6 text-sky-400" />
                    </div>
                    <div>
                        <Typography.Title>{t('Cloud')}</Typography.Title>
                        <Typography.Paragraph className="text-zinc-400 text-sm mt-1">
                            {t('Fast and accurate transcription via cloud services.')}
                        </Typography.Paragraph>
                    </div>
                    <ul className="space-y-2 text-sm text-zinc-400">
                        <li className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            {t('Instant setup')}
                        </li>
                        <li className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-blue-500" />
                            {t('OpenAI, Gemini, Groq')}
                        </li>
                        <li className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-orange-500" />
                            {t('Requires API key')}
                        </li>
                    </ul>
                </button>

                <button
                    onClick={() => onSelect('offline')}
                    className="p-6 rounded-lg border border-zinc-700 hover:border-green-500 hover:bg-green-500/10 transition-all text-left space-y-4 group"
                >
                    <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center group-hover:bg-green-500/30">
                        <HardDrive className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                        <Typography.Title>{t('Offline')}</Typography.Title>
                        <Typography.Paragraph className="text-zinc-400 text-sm mt-1">
                            {t('100% private, all processing on your device.')}
                        </Typography.Paragraph>
                    </div>
                    <ul className="space-y-2 text-sm text-zinc-400">
                        <li className="flex items-center gap-2">
                            <Lock className="w-4 h-4 text-green-500" />
                            {t('Complete privacy')}
                        </li>
                        <li className="flex items-center gap-2">
                            <HardDrive className="w-4 h-4 text-purple-500" />
                            {t('~400 MB download')}
                        </li>
                        <li className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            {t('Works without internet')}
                        </li>
                    </ul>
                </button>
            </div>
        </div>
    );
};
