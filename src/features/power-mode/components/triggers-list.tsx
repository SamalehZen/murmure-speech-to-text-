import { useState } from 'react';
import {
    AppWindow,
    Globe,
    Pencil,
    Trash2,
    CheckCircle2,
    XCircle,
    Code,
    FileText,
} from 'lucide-react';
import { Switch } from '@/components/switch';
import type { TriggerRule, TriggerMatchType } from '../power-mode.types';
import { isAppTrigger, getMatchTypeOption } from '../power-mode.types';
import { useTranslation } from '@/i18n';

interface TriggersListProps {
    triggers: TriggerRule[];
    onEdit: (trigger: TriggerRule) => void;
    onDelete: (id: string) => void;
    onToggle: (id: string) => void;
    onTest: (trigger: TriggerRule) => Promise<boolean>;
}

type TestStatus = 'idle' | 'testing' | 'match' | 'no-match';

const getMatchTypeIcon = (matchType: TriggerMatchType) => {
    if (
        matchType === 'window_title_regex' ||
        matchType === 'url_regex'
    ) {
        return Code;
    }
    if (
        matchType === 'app_name_contains' ||
        matchType === 'window_title_contains' ||
        matchType === 'process_name_equals'
    ) {
        return AppWindow;
    }
    return Globe;
};

const getMatchTypeBadge = (matchType: TriggerMatchType): string => {
    const option = getMatchTypeOption(matchType);
    return option?.label ?? matchType;
};

export const TriggersList = ({
    triggers,
    onEdit,
    onDelete,
    onToggle,
    onTest,
}: TriggersListProps) => {
    const { t } = useTranslation();
    const [testStatuses, setTestStatuses] = useState<Record<string, TestStatus>>({});

    const handleTest = async (trigger: TriggerRule) => {
        setTestStatuses((prev) => ({ ...prev, [trigger.id]: 'testing' }));
        try {
            const matches = await onTest(trigger);
            setTestStatuses((prev) => ({
                ...prev,
                [trigger.id]: matches ? 'match' : 'no-match',
            }));
            setTimeout(() => {
                setTestStatuses((prev) => ({ ...prev, [trigger.id]: 'idle' }));
            }, 3000);
        } catch {
            setTestStatuses((prev) => ({ ...prev, [trigger.id]: 'no-match' }));
            setTimeout(() => {
                setTestStatuses((prev) => ({ ...prev, [trigger.id]: 'idle' }));
            }, 3000);
        }
    };

    if (triggers.length === 0) {
        return (
            <div className="py-6 text-center text-zinc-500 text-sm">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                {t('No triggers configured. Add an application or custom rule.')}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {triggers.map((trigger) => {
                const Icon = getMatchTypeIcon(trigger.match_type);
                const isApp = isAppTrigger(trigger);
                const testStatus = testStatuses[trigger.id] ?? 'idle';

                return (
                    <div
                        key={trigger.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                            trigger.enabled
                                ? 'bg-zinc-800/50 border-zinc-700'
                                : 'bg-zinc-800/20 border-zinc-700/50 opacity-60'
                        }`}
                    >
                        <div
                            className={`flex items-center justify-center w-8 h-8 rounded-md ${
                                isApp
                                    ? 'bg-violet-500/20 text-violet-400'
                                    : 'bg-sky-500/20 text-sky-400'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-zinc-200 truncate">
                                    {trigger.name}
                                </span>
                                <span className="px-1.5 py-0.5 text-[10px] uppercase tracking-wide bg-zinc-700 text-zinc-400 rounded">
                                    {t(getMatchTypeBadge(trigger.match_type))}
                                </span>
                            </div>
                            <div className="text-xs text-zinc-500 truncate font-mono">
                                {trigger.pattern}
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => handleTest(trigger)}
                                disabled={testStatus === 'testing'}
                                className="p-1.5 text-zinc-500 hover:text-zinc-300 disabled:opacity-50 transition-colors"
                                title={t('Test Rule')}
                            >
                                {testStatus === 'testing' ? (
                                    <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                                ) : testStatus === 'match' ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                ) : testStatus === 'no-match' ? (
                                    <XCircle className="w-4 h-4 text-red-500" />
                                ) : (
                                    <CheckCircle2 className="w-4 h-4" />
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => onEdit(trigger)}
                                className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                                title={t('Edit')}
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => onDelete(trigger.id)}
                                className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                                title={t('Delete')}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <Switch
                                checked={trigger.enabled}
                                onCheckedChange={() => onToggle(trigger.id)}
                                className="ml-1"
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
