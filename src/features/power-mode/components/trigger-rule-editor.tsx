import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/dialog';
import { Input } from '@/components/input';
import { Switch } from '@/components/switch';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/select';
import type { TriggerRule, TriggerMatchType } from '../power-mode.types';
import {
    MATCH_TYPE_OPTIONS,
    getMatchTypeOption,
    createCustomTrigger,
} from '../power-mode.types';
import { useTranslation } from '@/i18n';

interface TriggerRuleEditorProps {
    rule: TriggerRule | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (rule: TriggerRule) => void;
    onTest: (rule: TriggerRule) => Promise<boolean>;
}

export const TriggerRuleEditor = ({
    rule,
    open,
    onOpenChange,
    onSave,
    onTest,
}: TriggerRuleEditorProps) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [matchType, setMatchType] = useState<TriggerMatchType>('app_name_contains');
    const [pattern, setPattern] = useState('');
    const [enabled, setEnabled] = useState(true);
    const [testResult, setTestResult] = useState<'idle' | 'testing' | 'match' | 'no-match'>('idle');

    const isEditing = rule != null;

    useEffect(() => {
        if (open) {
            if (rule != null) {
                setName(rule.name);
                setMatchType(rule.match_type);
                setPattern(rule.pattern);
                setEnabled(rule.enabled);
            } else {
                setName('');
                setMatchType('app_name_contains');
                setPattern('');
                setEnabled(true);
            }
            setTestResult('idle');
        }
    }, [open, rule]);

    const currentOption = getMatchTypeOption(matchType);
    const placeholder = currentOption?.placeholder ?? '';
    const isRegex = matchType === 'window_title_regex' || matchType === 'url_regex';

    const handleTest = async () => {
        setTestResult('testing');
        try {
            const testRule = createCustomTrigger(name, matchType, pattern);
            const matches = await onTest(testRule);
            setTestResult(matches ? 'match' : 'no-match');
            setTimeout(() => setTestResult('idle'), 3000);
        } catch {
            setTestResult('no-match');
            setTimeout(() => setTestResult('idle'), 3000);
        }
    };

    const handleSave = () => {
        if (name.trim().length === 0 || pattern.trim().length === 0) {
            return;
        }

        if (rule != null) {
            onSave({
                ...rule,
                name: name.trim(),
                match_type: matchType,
                pattern: pattern.trim(),
                enabled,
            });
        } else {
            const newTrigger = createCustomTrigger(
                name.trim(),
                matchType,
                pattern.trim(),
                enabled
            );
            onSave(newTrigger);
        }
        onOpenChange(false);
    };

    const canSave = name.trim().length > 0 && pattern.trim().length > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? t('Edit Trigger Rule') : t('Create Trigger Rule')}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">
                            {t('Rule Name')}
                        </label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('e.g., VS Code Editor')}
                            className="bg-zinc-800 border-zinc-700"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">
                            {t('Match Type')}
                        </label>
                        <Select
                            value={matchType}
                            onValueChange={(value) => setMatchType(value as TriggerMatchType)}
                        >
                            <SelectTrigger className="bg-zinc-800 border-zinc-700">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {MATCH_TYPE_OPTIONS.map((group) => (
                                    <SelectGroup key={group.group}>
                                        <SelectLabel className="text-zinc-500 text-xs uppercase tracking-wide">
                                            {t(group.group)}
                                        </SelectLabel>
                                        {group.options.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {t(option.label)}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-zinc-400">
                                {t('Pattern')}
                            </label>
                            <button
                                type="button"
                                onClick={handleTest}
                                disabled={testResult === 'testing' || pattern.trim().length === 0}
                                className="text-sm text-sky-400 hover:text-sky-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {testResult === 'testing' ? (
                                    t('Testing...')
                                ) : testResult === 'match' ? (
                                    <span className="flex items-center gap-1 text-green-500">
                                        <CheckCircle2 className="h-4 w-4" />
                                        {t('Matches!')}
                                    </span>
                                ) : testResult === 'no-match' ? (
                                    <span className="flex items-center gap-1 text-red-500">
                                        <XCircle className="h-4 w-4" />
                                        {t('No match')}
                                    </span>
                                ) : (
                                    t('Test Rule')
                                )}
                            </button>
                        </div>
                        <Input
                            value={pattern}
                            onChange={(e) => setPattern(e.target.value)}
                            placeholder={placeholder}
                            className="bg-zinc-800 border-zinc-700"
                        />
                        <p className="text-xs text-zinc-500">
                            {isRegex
                                ? t('Enter a regular expression pattern')
                                : t('Enter text to match (case-insensitive)')}
                        </p>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <label className="text-sm font-medium text-zinc-400">
                            {t('Enabled')}
                        </label>
                        <Switch
                            checked={enabled}
                            onCheckedChange={setEnabled}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="px-4 py-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                        {t('Cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!canSave}
                        className="px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                        {t('Save')}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
