import { useState } from 'react';
import { useTranslation } from '@/i18n';
import { Typography } from '@/components/typography';
import { SettingsUI } from '@/components/settings-ui';
import { Page } from '@/components/page';
import { ToneConfig } from '../llm-connect.types';
import { ToneEditor } from './tone-editor';
import { DEFAULT_TONES } from '../tones.constants';
import { Plus, Pencil, Trash2, Star, StarOff } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/select';

interface ToneSettingsProps {
    tones: ToneConfig[];
    appToneOverrides: Record<string, string>;
    defaultToneId?: string;
    onTonesChange: (tones: ToneConfig[]) => void;
    onSetAppToneOverride: (appName: string, toneId: string) => void;
    onSetDefaultTone: (toneId: string | undefined) => void;
}

export const ToneSettings = ({
    tones,
    appToneOverrides,
    defaultToneId,
    onTonesChange,
    onSetAppToneOverride,
    onSetDefaultTone,
}: ToneSettingsProps) => {
    const { t } = useTranslation();
    const [editingTone, setEditingTone] = useState<ToneConfig | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const effectiveTones = tones.length > 0 ? tones : DEFAULT_TONES;

    const handleAddTone = () => {
        setIsCreating(true);
        setEditingTone({
            id: `tone-${Date.now()}`,
            name: '',
            description: '',
            prompt_modifier: '',
            icon: '🎯',
            apps: [],
        });
    };

    const handleSaveTone = (tone: ToneConfig) => {
        if (isCreating) {
            onTonesChange([...effectiveTones, tone]);
        } else {
            onTonesChange(effectiveTones.map((t) => (t.id === tone.id ? tone : t)));
        }
        setEditingTone(null);
        setIsCreating(false);
    };

    const handleDeleteTone = (id: string) => {
        const defaultToneIds = DEFAULT_TONES.map((t) => t.id);
        if (defaultToneIds.includes(id)) {
            return;
        }
        onTonesChange(effectiveTones.filter((t) => t.id !== id));
    };

    const handleLoadDefaults = () => {
        const existingIds = new Set(tones.map((t) => t.id));
        const newTones = DEFAULT_TONES.filter((t) => !existingIds.has(t.id));
        onTonesChange([...tones, ...newTones]);
    };

    const handleSetDefault = (toneId: string) => {
        if (defaultToneId === toneId) {
            onSetDefaultTone(undefined);
        } else {
            onSetDefaultTone(toneId);
        }
    };

    const allAppsWithOverrides = Object.keys(appToneOverrides);
    const allAppsFromTones = effectiveTones.flatMap((t) => t.apps);
    const uniqueApps = [...new Set([...allAppsWithOverrides, ...allAppsFromTones])].sort();

    return (
        <SettingsUI.Container className="mb-6">
            <SettingsUI.Item>
                <SettingsUI.Description>
                    <Typography.Title>{t('Adaptive Tones')}</Typography.Title>
                    <Typography.Paragraph>
                        {t('Automatically adjust reformulation style based on the active application')}
                    </Typography.Paragraph>
                </SettingsUI.Description>
            </SettingsUI.Item>

            <SettingsUI.Separator />

            <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                    <Typography.Title>{t('Available Tones')}</Typography.Title>
                    <div className="flex items-center gap-2">
                        {tones.length === 0 && (
                            <Page.SecondaryButton size="sm" onClick={handleLoadDefaults}>
                                {t('Load Defaults')}
                            </Page.SecondaryButton>
                        )}
                        <Page.SecondaryButton size="sm" onClick={handleAddTone}>
                            <Plus className="h-4 w-4 mr-1" />
                            {t('Add Tone')}
                        </Page.SecondaryButton>
                    </div>
                </div>

                <div className="space-y-2">
                    {effectiveTones.map((tone) => (
                        <div
                            key={tone.id}
                            className="flex items-center gap-3 p-3 rounded-lg border bg-zinc-900/50 border-zinc-800"
                        >
                            <span className="text-2xl">{tone.icon}</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-zinc-200">{tone.name}</span>
                                    {defaultToneId === tone.id && (
                                        <span className="text-xs text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">
                                            {t('Default')}
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-zinc-500">{tone.description}</div>
                                {tone.apps.length > 0 && (
                                    <div className="text-xs text-zinc-600 mt-1 truncate">
                                        {tone.apps.slice(0, 3).join(', ')}
                                        {tone.apps.length > 3 && ` +${tone.apps.length - 3}`}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => handleSetDefault(tone.id)}
                                    className={`p-1.5 transition-colors ${
                                        defaultToneId === tone.id
                                            ? 'text-yellow-500'
                                            : 'text-zinc-500 hover:text-yellow-400'
                                    }`}
                                    title={defaultToneId === tone.id ? t('Remove default') : t('Set as default')}
                                >
                                    {defaultToneId === tone.id ? (
                                        <Star className="h-4 w-4 fill-current" />
                                    ) : (
                                        <StarOff className="h-4 w-4" />
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsCreating(false);
                                        setEditingTone(tone);
                                    }}
                                    className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                                {!DEFAULT_TONES.find((t) => t.id === tone.id) && (
                                    <button
                                        onClick={() => handleDeleteTone(tone.id)}
                                        className="p-1.5 text-zinc-400 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {uniqueApps.length > 0 && (
                <>
                    <SettingsUI.Separator />
                    <div className="px-4 py-3">
                        <Typography.Title className="mb-3">{t('App Tone Overrides')}</Typography.Title>
                        <Typography.Paragraph className="mb-4">
                            {t('Override the default tone for specific applications')}
                        </Typography.Paragraph>

                        <div className="space-y-2">
                            {uniqueApps.map((appName) => {
                                const currentToneId = appToneOverrides[appName];
                                const defaultTone = effectiveTones.find((t) =>
                                    t.apps.includes(appName)
                                );

                                return (
                                    <div
                                        key={appName}
                                        className="flex items-center gap-3 p-2 rounded-lg bg-zinc-900/30"
                                    >
                                        <span className="flex-1 text-sm text-zinc-300 truncate">
                                            {appName}
                                        </span>
                                        <Select
                                            value={currentToneId || '__default__'}
                                            onValueChange={(value) =>
                                                onSetAppToneOverride(
                                                    appName,
                                                    value === '__default__' ? '' : value
                                                )
                                            }
                                        >
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__default__">
                                                    {defaultTone
                                                        ? `${defaultTone.icon} ${defaultTone.name} (${t('default')})`
                                                        : t('No tone')}
                                                </SelectItem>
                                                {effectiveTones.map((tone) => (
                                                    <SelectItem key={tone.id} value={tone.id}>
                                                        {tone.icon} {tone.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {editingTone && (
                <ToneEditor
                    tone={editingTone}
                    onSave={handleSaveTone}
                    onCancel={() => {
                        setEditingTone(null);
                        setIsCreating(false);
                    }}
                />
            )}
        </SettingsUI.Container>
    );
};
