import { useState } from 'react';
import { useTranslation } from '@/i18n';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/dialog';
import { Input } from '@/components/input';
import { Typography } from '@/components/typography';
import { Page } from '@/components/page';
import { Switch } from '@/components/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/select';
import { HighlightedPromptEditor } from './highlighted-prompt-editor';
import { AppPromptRule, AppMatchType } from '../llm-connect.types';
import { CheckCircle2, XCircle } from 'lucide-react';

interface AppRuleEditorProps {
    rule: AppPromptRule;
    onSave: (rule: AppPromptRule) => void;
    onCancel: () => void;
    onTestRule: (rule: AppPromptRule) => Promise<boolean>;
}

const MATCH_TYPE_LABELS: Record<AppMatchType, string> = {
    app_name_contains: 'App name contains',
    window_title_contains: 'Window title contains',
    process_name_equals: 'Process name equals',
    window_title_regex: 'Window title regex',
    url_contains: 'URL contains',
    bundle_id_equals: 'Bundle ID equals',
};

export const AppRuleEditor = ({
    rule,
    onSave,
    onCancel,
    onTestRule,
}: AppRuleEditorProps) => {
    const { t } = useTranslation();
    const [editedRule, setEditedRule] = useState<AppPromptRule>(rule);
    const [testResult, setTestResult] = useState<'idle' | 'testing' | 'match' | 'no-match'>('idle');

    const handleTestRule = async () => {
        setTestResult('testing');
        try {
            const matches = await onTestRule(editedRule);
            setTestResult(matches ? 'match' : 'no-match');
            setTimeout(() => setTestResult('idle'), 3000);
        } catch {
            setTestResult('no-match');
            setTimeout(() => setTestResult('idle'), 3000);
        }
    };

    const handleSave = () => {
        if (editedRule.name && editedRule.match_pattern && editedRule.prompt_template) {
            onSave(editedRule);
        }
    };

    return (
        <Dialog open onOpenChange={() => onCancel()}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {rule.name ? t('Edit Rule') : t('Create Rule')}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Typography.Title>{t('Rule Name')}</Typography.Title>
                        <Input
                            value={editedRule.name}
                            onChange={(e) =>
                                setEditedRule({ ...editedRule, name: e.target.value })
                            }
                            placeholder={t('e.g., Gmail / Email')}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Typography.Title>{t('Match Type')}</Typography.Title>
                            <Select
                                value={editedRule.match_type}
                                onValueChange={(value) =>
                                    setEditedRule({
                                        ...editedRule,
                                        match_type: value as AppMatchType,
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(MATCH_TYPE_LABELS).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                            {t(label)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Typography.Title>{t('Priority')}</Typography.Title>
                            <Input
                                type="number"
                                value={editedRule.priority}
                                onChange={(e) =>
                                    setEditedRule({
                                        ...editedRule,
                                        priority: parseInt(e.target.value) || 0,
                                    })
                                }
                                min={0}
                                max={100}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Typography.Title>{t('Match Pattern')}</Typography.Title>
                            <Page.SecondaryButton
                                size="sm"
                                onClick={handleTestRule}
                                disabled={testResult === 'testing' || !editedRule.match_pattern}
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
                            </Page.SecondaryButton>
                        </div>
                        <Input
                            value={editedRule.match_pattern}
                            onChange={(e) =>
                                setEditedRule({ ...editedRule, match_pattern: e.target.value })
                            }
                            placeholder={
                                editedRule.match_type === 'window_title_regex'
                                    ? '(gmail|outlook|mail)'
                                    : 'gmail'
                            }
                        />
                        <Typography.Paragraph>
                            {editedRule.match_type === 'window_title_regex'
                                ? t('Enter a regular expression pattern')
                                : t('Enter text to match (case-insensitive)')}
                        </Typography.Paragraph>
                    </div>

                    <div className="space-y-2">
                        <Typography.Title>{t('Prompt Template')}</Typography.Title>
                        <div className="h-[200px]">
                            <HighlightedPromptEditor
                                value={editedRule.prompt_template}
                                onChange={(value) =>
                                    setEditedRule({ ...editedRule, prompt_template: value })
                                }
                                placeholder={t('Enter the prompt template...')}
                                className="h-full"
                            />
                        </div>
                        <Typography.Paragraph>
                            {t('Use {{TRANSCRIPT}} for the transcription and {{DICTIONARY}} for custom words')}
                        </Typography.Paragraph>
                    </div>

                    <div className="flex items-center justify-between">
                        <Typography.Title>{t('Enabled')}</Typography.Title>
                        <Switch
                            checked={editedRule.enabled}
                            onCheckedChange={(checked) =>
                                setEditedRule({ ...editedRule, enabled: checked })
                            }
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Page.SecondaryButton variant="ghost" onClick={onCancel}>
                        {t('Cancel')}
                    </Page.SecondaryButton>
                    <Page.SecondaryButton
                        onClick={handleSave}
                        disabled={
                            !editedRule.name ||
                            !editedRule.match_pattern ||
                            !editedRule.prompt_template
                        }
                    >
                        {t('Save')}
                    </Page.SecondaryButton>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
