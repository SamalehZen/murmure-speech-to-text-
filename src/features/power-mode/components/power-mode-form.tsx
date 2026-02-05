import { useState, useEffect } from 'react';
import { X, AppWindow, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/dialog';
import { Input } from '@/components/input';
import { EmojiPicker } from './emoji-picker';
import { AppPicker } from './app-picker';
import { UrlInput } from './url-input';
import { AISettingsSection } from './ai-settings-section';
import type { PowerModeConfig, AppTrigger } from '../power-mode.types';
import { createDefaultPowerMode } from '../power-mode.types';
import type { LLMProvider } from '@/features/llm-connect/llm-connect.types';
import { useTranslation } from '@/i18n';

interface PowerModeFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    powerMode: PowerModeConfig | null;
    onSave: (config: PowerModeConfig) => void;
}

export const PowerModeForm = ({
    open,
    onOpenChange,
    powerMode,
    onSave,
}: PowerModeFormProps) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState<PowerModeConfig>(
        powerMode || createDefaultPowerMode()
    );
    const [showAppPicker, setShowAppPicker] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setFormData(powerMode || createDefaultPowerMode());
            setShowAdvanced(false);
        }
    }, [open, powerMode]);

    const handleOpenChange = (isOpen: boolean) => {
        onOpenChange(isOpen);
    };

    const handleSave = async () => {
        if (formData.name.trim().length === 0) {
            return;
        }
        setIsSaving(true);
        try {
            await onSave(formData);
            onOpenChange(false);
        } finally {
            setIsSaving(false);
        }
    };

    const removeAppTrigger = (id: string) => {
        setFormData({
            ...formData,
            app_triggers: formData.app_triggers.filter((t) => t.id !== id),
        });
    };

    const handleAppsSelected = (apps: AppTrigger[]) => {
        setFormData({
            ...formData,
            app_triggers: apps,
        });
    };

    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {powerMode ? t('Edit Power Mode') : t('Create Power Mode')}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-zinc-400">
                                {t('Name & Icon')}
                            </label>
                            <div className="flex gap-3">
                                <EmojiPicker
                                    value={formData.emoji}
                                    onChange={(emoji) =>
                                        setFormData({ ...formData, emoji })
                                    }
                                />
                                <Input
                                    placeholder={t('Power Mode name')}
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            name: e.target.value,
                                        })
                                    }
                                    className="flex-1 bg-zinc-800 border-zinc-700"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-medium text-zinc-400">
                                {t('When to Trigger')}
                            </label>

                            <div className="space-y-3 p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm text-zinc-300">
                                            <AppWindow className="w-4 h-4" />
                                            {t('Applications')}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowAppPicker(true)}
                                            className="text-sm text-sky-400 hover:text-sky-300 transition-colors"
                                        >
                                            {t('Select apps')}
                                        </button>
                                    </div>

                                    {formData.app_triggers.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {formData.app_triggers.map((trigger) => (
                                                <div
                                                    key={trigger.id}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-zinc-700 rounded-full"
                                                >
                                                    <span className="text-sm text-zinc-300">
                                                        {trigger.display_name}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeAppTrigger(trigger.id)
                                                        }
                                                        className="text-zinc-500 hover:text-zinc-300"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-zinc-700 pt-3 space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                                        <Globe className="w-4 h-4" />
                                        {t('Websites')}
                                    </div>
                                    <UrlInput
                                        urls={formData.url_triggers}
                                        onChange={(urls) =>
                                            setFormData({
                                                ...formData,
                                                url_triggers: urls,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-medium text-zinc-400">
                                {t('AI Settings')}
                            </label>
                            <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                                <AISettingsSection
                                    isEnabled={formData.is_ai_enhancement_enabled}
                                    onEnabledChange={(enabled) =>
                                        setFormData({
                                            ...formData,
                                            is_ai_enhancement_enabled: enabled,
                                        })
                                    }
                                    provider={formData.selected_ai_provider}
                                    onProviderChange={(provider: LLMProvider) =>
                                        setFormData({
                                            ...formData,
                                            selected_ai_provider: provider,
                                        })
                                    }
                                    model={formData.selected_ai_model}
                                    onModelChange={(model) =>
                                        setFormData({
                                            ...formData,
                                            selected_ai_model: model,
                                        })
                                    }
                                    promptTemplate={formData.prompt_template}
                                    onPromptChange={(prompt) =>
                                        setFormData({
                                            ...formData,
                                            prompt_template: prompt,
                                        })
                                    }
                                    useScreenCapture={formData.use_screen_capture}
                                    onScreenCaptureChange={(enabled) =>
                                        setFormData({
                                            ...formData,
                                            use_screen_capture: enabled,
                                        })
                                    }
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="button"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                            >
                                {showAdvanced ? (
                                    <ChevronUp className="w-4 h-4" />
                                ) : (
                                    <ChevronDown className="w-4 h-4" />
                                )}
                                {t('Advanced settings')}
                            </button>

                            {showAdvanced && (
                                <div className="mt-3 p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg space-y-3">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-zinc-400">
                                            {t('Priority')}
                                        </label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={100}
                                            value={formData.priority}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    priority: parseInt(
                                                        e.target.value,
                                                        10
                                                    ) || 50,
                                                })
                                            }
                                            className="w-24 bg-zinc-800 border-zinc-700"
                                        />
                                        <p className="text-xs text-zinc-500">
                                            {t(
                                                'Higher priority Power Modes are applied first when multiple match'
                                            )}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <button
                            type="button"
                            onClick={() => handleOpenChange(false)}
                            className="px-4 py-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                            {t('Cancel')}
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={
                                formData.name.trim().length === 0 || isSaving
                            }
                            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                        >
                            {isSaving ? t('Saving...') : t('Save')}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AppPicker
                open={showAppPicker}
                onOpenChange={setShowAppPicker}
                selectedApps={formData.app_triggers}
                onSelect={handleAppsSelected}
            />
        </>
    );
};
