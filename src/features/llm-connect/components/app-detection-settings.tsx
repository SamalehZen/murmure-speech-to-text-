import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { Typography } from '@/components/typography';
import { SettingsUI } from '@/components/settings-ui';
import { Switch } from '@/components/switch';
import { Page } from '@/components/page';
import { AppPromptRule, ActiveWindowInfo, DEFAULT_APP_RULES } from '../llm-connect.types';
import { AppRuleEditor } from './app-rule-editor';
import { Plus, Pencil, Trash2, GripVertical, Monitor } from 'lucide-react';

interface AppDetectionSettingsProps {
    enabled: boolean;
    rules: AppPromptRule[];
    currentWindow: ActiveWindowInfo | null;
    onToggle: (enabled: boolean) => void;
    onRulesChange: (rules: AppPromptRule[]) => void;
    onRefreshWindow: () => void;
    onTestRule: (rule: AppPromptRule) => Promise<boolean>;
}

export const AppDetectionSettings = ({
    enabled,
    rules,
    currentWindow,
    onToggle,
    onRulesChange,
    onRefreshWindow,
    onTestRule,
}: AppDetectionSettingsProps) => {
    const { t } = useTranslation();
    const [editingRule, setEditingRule] = useState<AppPromptRule | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        if (enabled) {
            onRefreshWindow();
            const interval = setInterval(onRefreshWindow, 2000);
            return () => clearInterval(interval);
        }
    }, [enabled, onRefreshWindow]);

    const handleAddRule = () => {
        setIsCreating(true);
        setEditingRule({
            id: `rule-${Date.now()}`,
            name: '',
            match_type: 'window_title_contains',
            match_pattern: '',
            prompt_template: '',
            priority: 50,
            enabled: true,
        });
    };

    const handleSaveRule = (rule: AppPromptRule) => {
        if (isCreating) {
            onRulesChange([...rules, rule]);
        } else {
            onRulesChange(rules.map((r) => (r.id === rule.id ? rule : r)));
        }
        setEditingRule(null);
        setIsCreating(false);
    };

    const handleDeleteRule = (id: string) => {
        onRulesChange(rules.filter((r) => r.id !== id));
    };

    const handleToggleRule = (id: string) => {
        onRulesChange(
            rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
        );
    };

    const handleLoadDefaults = () => {
        const existingIds = new Set(rules.map((r) => r.id));
        const newRules = DEFAULT_APP_RULES.filter((r) => !existingIds.has(r.id));
        onRulesChange([...rules, ...newRules]);
    };

    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

    return (
        <SettingsUI.Container className="mb-6">
            <SettingsUI.Item>
                <SettingsUI.Description>
                    <Typography.Title>{t('App Detection')}</Typography.Title>
                    <Typography.Paragraph>
                        {t('Automatically adapt prompts based on the active application')}
                    </Typography.Paragraph>
                </SettingsUI.Description>
                <Switch checked={enabled} onCheckedChange={onToggle} />
            </SettingsUI.Item>

            {enabled && currentWindow && (
                <>
                    <SettingsUI.Separator />
                    <SettingsUI.Item>
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                            <Monitor className="h-4 w-4" />
                            <span>{t('Current window')}:</span>
                            <span className="text-zinc-200 font-medium">
                                {currentWindow.app_name || currentWindow.process_name}
                            </span>
                            {currentWindow.window_title && (
                                <span className="text-zinc-500 truncate max-w-[200px]">
                                    - {currentWindow.window_title}
                                </span>
                            )}
                        </div>
                    </SettingsUI.Item>
                </>
            )}

            {enabled && (
                <>
                    <SettingsUI.Separator />
                    <div className="px-4 py-3">
                        <div className="flex items-center justify-between mb-3">
                            <Typography.Title>{t('App Rules')}</Typography.Title>
                            <div className="flex items-center gap-2">
                                {rules.length === 0 && (
                                    <Page.SecondaryButton
                                        size="sm"
                                        onClick={handleLoadDefaults}
                                    >
                                        {t('Load Defaults')}
                                    </Page.SecondaryButton>
                                )}
                                <Page.SecondaryButton size="sm" onClick={handleAddRule}>
                                    <Plus className="h-4 w-4 mr-1" />
                                    {t('Add Rule')}
                                </Page.SecondaryButton>
                            </div>
                        </div>

                        {sortedRules.length === 0 ? (
                            <div className="text-center py-8 text-zinc-500">
                                <p>{t('No rules configured')}</p>
                                <p className="text-sm mt-1">
                                    {t('Add rules to customize prompts per application')}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {sortedRules.map((rule) => (
                                    <div
                                        key={rule.id}
                                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                                            rule.enabled
                                                ? 'bg-zinc-900/50 border-zinc-800'
                                                : 'bg-zinc-900/20 border-zinc-800/50 opacity-60'
                                        }`}
                                    >
                                        <GripVertical className="h-4 w-4 text-zinc-500 cursor-grab" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-zinc-200">
                                                    {rule.name}
                                                </span>
                                                <span className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                                                    {rule.priority}
                                                </span>
                                            </div>
                                            <div className="text-xs text-zinc-500 truncate">
                                                {rule.match_type}: {rule.match_pattern}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={rule.enabled}
                                                onCheckedChange={() => handleToggleRule(rule.id)}
                                            />
                                            <button
                                                onClick={() => {
                                                    setIsCreating(false);
                                                    setEditingRule(rule);
                                                }}
                                                className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteRule(rule.id)}
                                                className="p-1.5 text-zinc-400 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {editingRule && (
                <AppRuleEditor
                    rule={editingRule}
                    onSave={handleSaveRule}
                    onCancel={() => {
                        setEditingRule(null);
                        setIsCreating(false);
                    }}
                    onTestRule={onTestRule}
                />
            )}
        </SettingsUI.Container>
    );
};
