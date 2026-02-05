import { useState, useEffect } from 'react';
import { AppWindow, Plus, ChevronDown, ChevronUp } from 'lucide-react';
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
import { TriggerRuleEditor } from './trigger-rule-editor';
import { TriggersList } from './triggers-list';
import type { PowerModeConfig, TriggerRule } from '../power-mode.types';
import { createDefaultPowerMode, isAppTrigger } from '../power-mode.types';
import { powerModeApi } from '../api/power-mode.api';
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
    const [showRuleEditor, setShowRuleEditor] = useState(false);
    const [editingRule, setEditingRule] = useState<TriggerRule | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const appTriggers = formData.triggers.filter(isAppTrigger);
    const urlDomainTriggers = formData.triggers.filter(
        (t) => t.match_type === 'url_domain_equals'
    );
    const triggersForList = formData.triggers.filter(
        (t) => t.match_type !== 'url_domain_equals'
    );

    useEffect(() => {
        if (open) {
            setFormData(powerMode || createDefaultPowerMode());
            setShowAdvanced(false);
            setEditingRule(null);
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

    const handleAppsSelected = (apps: TriggerRule[]) => {
        const nonAppTriggers = formData.triggers.filter((t) => !isAppTrigger(t));
        setFormData({
            ...formData,
            triggers: [...nonAppTriggers, ...apps],
        });
    };

    const handleUrlDomainChanged = (urls: TriggerRule[]) => {
        const nonUrlDomainTriggers = formData.triggers.filter(
            (t) => t.match_type !== 'url_domain_equals'
        );
        setFormData({
            ...formData,
            triggers: [...nonUrlDomainTriggers, ...urls],
        });
    };

    const handleAddTrigger = (trigger: TriggerRule) => {
        setFormData({
            ...formData,
            triggers: [...formData.triggers, trigger],
        });
    };

    const handleEditTrigger = (trigger: TriggerRule) => {
        setEditingRule(trigger);
        setShowRuleEditor(true);
    };

    const handleSaveTrigger = (trigger: TriggerRule) => {
        const existingIndex = formData.triggers.findIndex((t) => t.id === trigger.id);
        if (existingIndex >= 0) {
            const updatedTriggers = [...formData.triggers];
            updatedTriggers[existingIndex] = trigger;
            setFormData({
                ...formData,
                triggers: updatedTriggers,
            });
        } else {
            handleAddTrigger(trigger);
        }
        setEditingRule(null);
    };

    const handleDeleteTrigger = (id: string) => {
        setFormData({
            ...formData,
            triggers: formData.triggers.filter((t) => t.id !== id),
        });
    };

    const handleToggleTrigger = (id: string) => {
        setFormData({
            ...formData,
            triggers: formData.triggers.map((t) =>
                t.id === id ? { ...t, enabled: !t.enabled } : t
            ),
        });
    };

    const handleTestTrigger = async (trigger: TriggerRule): Promise<boolean> => {
        return powerModeApi.testTrigger(trigger.match_type, trigger.pattern);
    };

    const handleOpenNewRule = () => {
        setEditingRule(null);
        setShowRuleEditor(true);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {powerMode != null ? t('Edit Power Mode') : t('Create Power Mode')}
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

                            <div className="space-y-4 p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowAppPicker(true)}
                                        className="flex items-center gap-2 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm rounded-lg transition-colors"
                                    >
                                        <AppWindow className="w-4 h-4" />
                                        {t('Add Application')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleOpenNewRule}
                                        className="flex items-center gap-2 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm rounded-lg transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        {t('Add Custom Rule')}
                                    </button>
                                </div>

                                <div className="border-t border-zinc-700 pt-4">
                                    <UrlInput
                                        urls={urlDomainTriggers}
                                        onChange={handleUrlDomainChanged}
                                    />
                                </div>

                                {triggersForList.length > 0 && (
                                    <div className="border-t border-zinc-700 pt-4">
                                        <TriggersList
                                            triggers={triggersForList}
                                            onEdit={handleEditTrigger}
                                            onDelete={handleDeleteTrigger}
                                            onToggle={handleToggleTrigger}
                                            onTest={handleTestTrigger}
                                        />
                                    </div>
                                )}
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
                selectedApps={appTriggers}
                onSelect={handleAppsSelected}
            />

            <TriggerRuleEditor
                rule={editingRule}
                open={showRuleEditor}
                onOpenChange={setShowRuleEditor}
                onSave={handleSaveTrigger}
                onTest={handleTestTrigger}
            />
        </>
    );
};
