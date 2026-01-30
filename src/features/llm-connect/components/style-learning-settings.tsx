import { useState } from 'react';
import { useTranslation } from '@/i18n';
import { Typography } from '@/components/typography';
import { SettingsUI } from '@/components/settings-ui';
import { Page } from '@/components/page';
import { Switch } from '@/components/switch';
import {
    StyleProfile,
    LearnedPatterns,
    EmojiUsage,
    Formality,
    MessageLength,
} from '../llm-connect.types';
import { useStyleLearning } from '../hooks/use-style-learning';
import {
    Brain,
    Trash2,
    ChevronDown,
    ChevronUp,
    Eye,
    RotateCcw,
    XCircle,
    CheckCircle,
} from 'lucide-react';

interface StyleVisualizationProps {
    patterns: LearnedPatterns;
}

const EMOJI_LABELS: Record<EmojiUsage, string> = {
    never: 'Never',
    rarely: 'Rarely',
    sometimes: 'Sometimes',
    often: 'Often',
};

const FORMALITY_LABELS: Record<Formality, string> = {
    formal: 'Formal',
    neutral: 'Neutral',
    casual: 'Casual',
};

const LENGTH_LABELS: Record<MessageLength, string> = {
    short: 'Short',
    medium: 'Medium',
    long: 'Long',
};

const StyleVisualization = ({ patterns }: StyleVisualizationProps) => {
    const { t } = useTranslation();

    return (
        <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
                <span className="text-zinc-400 w-24">{t('Formality')}:</span>
                <div className="flex gap-1">
                    {(['formal', 'neutral', 'casual'] as const).map((level) => (
                        <span
                            key={level}
                            className={`px-2 py-0.5 rounded text-xs ${
                                patterns.formality === level
                                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                            }`}
                        >
                            {t(FORMALITY_LABELS[level])}
                        </span>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <span className="text-zinc-400 w-24">{t('Emojis')}:</span>
                <div className="flex gap-1">
                    {(['never', 'rarely', 'sometimes', 'often'] as const).map((level) => (
                        <span
                            key={level}
                            className={`px-2 py-0.5 rounded text-xs ${
                                patterns.emojiUsage === level
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                            }`}
                        >
                            {t(EMOJI_LABELS[level])}
                        </span>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <span className="text-zinc-400 w-24">{t('Length')}:</span>
                <div className="flex gap-1">
                    {(['short', 'medium', 'long'] as const).map((level) => (
                        <span
                            key={level}
                            className={`px-2 py-0.5 rounded text-xs ${
                                patterns.averageLength === level
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                            }`}
                        >
                            {t(LENGTH_LABELS[level])}
                        </span>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-zinc-400">{t('Abbreviations')}:</span>
                    {patterns.usesAbbreviations ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                    ) : (
                        <XCircle className="h-4 w-4 text-zinc-500" />
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-zinc-400">{t('Informal (tu)')}:</span>
                    {patterns.usesTutoring ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                    ) : (
                        <XCircle className="h-4 w-4 text-zinc-500" />
                    )}
                </div>
            </div>

            {patterns.greetings.length > 0 && (
                <div className="flex items-start gap-2">
                    <span className="text-zinc-400 w-24 shrink-0">{t('Greetings')}:</span>
                    <div className="flex flex-wrap gap-1">
                        {patterns.greetings.map((greeting) => (
                            <span
                                key={greeting}
                                className="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            >
                                {greeting}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {patterns.closings.length > 0 && (
                <div className="flex items-start gap-2">
                    <span className="text-zinc-400 w-24 shrink-0">{t('Closings')}:</span>
                    <div className="flex flex-wrap gap-1">
                        {patterns.closings.map((closing) => (
                            <span
                                key={closing}
                                className="px-2 py-0.5 rounded text-xs bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            >
                                {closing}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {patterns.commonPhrases.length > 0 && (
                <div className="flex items-start gap-2">
                    <span className="text-zinc-400 w-24 shrink-0">{t('Expressions')}:</span>
                    <div className="flex flex-wrap gap-1">
                        {patterns.commonPhrases.map((phrase) => (
                            <span
                                key={phrase}
                                className="px-2 py-0.5 rounded text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                            >
                                {phrase}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

interface ProfileCardProps {
    profile: StyleProfile;
    minSamples: number;
    onToggle: (enabled: boolean) => void;
    onReset: () => void;
    onPreview: () => void;
}

const ProfileCard = ({ profile, minSamples, onToggle, onReset, onPreview }: ProfileCardProps) => {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(false);

    const isReady = profile.sampleCount >= minSamples;

    return (
        <div className="rounded-lg border bg-zinc-900/50 border-zinc-800 overflow-hidden">
            <div className="flex items-center gap-3 p-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10">
                    <Brain className="h-5 w-5 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-200">{profile.appName}</span>
                        {isReady ? (
                            <span className="text-xs text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">
                                {t('Active')}
                            </span>
                        ) : (
                            <span className="text-xs text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                {t('Learning')} ({profile.sampleCount}/{minSamples})
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-zinc-500">
                        {profile.sampleCount} {t('samples')} •{' '}
                        {new Date(profile.lastUpdated).toLocaleDateString()}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Switch checked={profile.enabled} onCheckedChange={onToggle} />
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                        {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                        ) : (
                            <ChevronDown className="h-4 w-4" />
                        )}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="border-t border-zinc-800 p-4 space-y-4">
                    <StyleVisualization patterns={profile.patterns} />

                    {profile.examples.length > 0 && (
                        <div className="space-y-2">
                            <Typography.Title>{t('Recent Examples')}</Typography.Title>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                {profile.examples.slice(-5).map((example, index) => (
                                    <div
                                        key={index}
                                        className="text-xs text-zinc-400 bg-zinc-800/50 p-2 rounded truncate"
                                    >
                                        {example}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <Page.SecondaryButton size="sm" onClick={onPreview}>
                            <Eye className="h-4 w-4 mr-1" />
                            {t('Preview Style')}
                        </Page.SecondaryButton>
                        <Page.SecondaryButton
                            size="sm"
                            onClick={onReset}
                            className="text-red-400 hover:text-red-300"
                        >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {t('Reset')}
                        </Page.SecondaryButton>
                    </div>
                </div>
            )}
        </div>
    );
};

export const StyleLearningSettings = () => {
    const { t } = useTranslation();
    const {
        settings,
        isLoading,
        toggleEnabled,
        resetProfile,
        resetAllProfiles,
        toggleAppEnabled,
        getStylePreview,
    } = useStyleLearning();

    const [previewContent, setPreviewContent] = useState<string | null>(null);
    const [previewApp, setPreviewApp] = useState<string | null>(null);

    const profiles = Object.values(settings.profiles);

    const handlePreview = async (appName: string) => {
        const preview = await getStylePreview(appName);
        setPreviewApp(appName);
        setPreviewContent(preview);
    };

    const handleClosePreview = () => {
        setPreviewApp(null);
        setPreviewContent(null);
    };

    if (isLoading) {
        return (
            <SettingsUI.Container className="mb-6">
                <SettingsUI.Item>
                    <div className="animate-pulse h-20 bg-zinc-800 rounded" />
                </SettingsUI.Item>
            </SettingsUI.Container>
        );
    }

    return (
        <SettingsUI.Container className="mb-6">
            <SettingsUI.Item>
                <SettingsUI.Description>
                    <Typography.Title>{t('Style Learning')}</Typography.Title>
                    <Typography.Paragraph>
                        {t(
                            'Automatically learn your writing style for each application and apply it to transcriptions'
                        )}
                    </Typography.Paragraph>
                </SettingsUI.Description>
                <Switch checked={settings.enabled} onCheckedChange={toggleEnabled} />
            </SettingsUI.Item>

            {settings.enabled && (
                <>
                    <SettingsUI.Separator />

                    <div className="px-4 py-3">
                        <div className="flex items-center justify-between mb-3">
                            <Typography.Title>
                                {t('Learned Profiles')} ({profiles.length})
                            </Typography.Title>
                            {profiles.length > 0 && (
                                <Page.SecondaryButton size="sm" onClick={resetAllProfiles}>
                                    <RotateCcw className="h-4 w-4 mr-1" />
                                    {t('Reset All')}
                                </Page.SecondaryButton>
                            )}
                        </div>

                        {profiles.length === 0 ? (
                            <div className="text-center py-8 text-zinc-500">
                                <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>{t('No style profiles yet')}</p>
                                <p className="text-sm mt-1">
                                    {t('Start transcribing to learn your writing style')}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {profiles.map((profile) => (
                                    <ProfileCard
                                        key={profile.appName}
                                        profile={profile}
                                        minSamples={settings.minSamplesForLearning}
                                        onToggle={(enabled) =>
                                            toggleAppEnabled(profile.appName, enabled)
                                        }
                                        onReset={() => resetProfile(profile.appName)}
                                        onPreview={() => handlePreview(profile.appName)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {settings.excludedApps.length > 0 && (
                        <>
                            <SettingsUI.Separator />
                            <div className="px-4 py-3">
                                <Typography.Title className="mb-2">
                                    {t('Excluded Apps')}
                                </Typography.Title>
                                <div className="flex flex-wrap gap-1">
                                    {settings.excludedApps.map((app) => (
                                        <span
                                            key={app}
                                            className="px-2 py-1 rounded text-xs bg-zinc-800 text-zinc-400 border border-zinc-700"
                                        >
                                            {app}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}

            {previewApp && previewContent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-lg w-full mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <Typography.Title>
                                {t('Style Preview for')} {previewApp}
                            </Typography.Title>
                            <button
                                onClick={handleClosePreview}
                                className="text-zinc-400 hover:text-zinc-200"
                            >
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="bg-zinc-800 rounded p-4 text-sm text-zinc-300 whitespace-pre-wrap font-mono">
                            {previewContent}
                        </div>
                        <div className="mt-4 text-xs text-zinc-500">
                            {t('This prompt will be added to reformulations for this app')}
                        </div>
                    </div>
                </div>
            )}
        </SettingsUI.Container>
    );
};
