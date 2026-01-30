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
import { Textarea } from '@/components/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/select';
import { TextTemplate } from '../llm-connect.types';
import { TEMPLATE_CATEGORIES } from '../templates.constants';
import { Eye } from 'lucide-react';

interface TemplateEditorProps {
    template: TextTemplate;
    onSave: (template: TextTemplate) => void;
    onCancel: () => void;
}

export const TemplateEditor = ({ template, onSave, onCancel }: TemplateEditorProps) => {
    const { t } = useTranslation();
    const [editedTemplate, setEditedTemplate] = useState<TextTemplate>(template);
    const [showPreview, setShowPreview] = useState(false);

    const handleSave = () => {
        if (editedTemplate.name && editedTemplate.content && editedTemplate.triggerWords.length > 0) {
            onSave(editedTemplate);
        }
    };

    const handleTriggerWordsChange = (value: string) => {
        const words = value
            .split(',')
            .map((word) => word.trim())
            .filter((word) => word.length > 0);
        setEditedTemplate({ ...editedTemplate, triggerWords: words });
    };

    const handleAppPatternsChange = (value: string) => {
        const patterns = value
            .split(',')
            .map((pattern) => pattern.trim())
            .filter((pattern) => pattern.length > 0);
        setEditedTemplate({ ...editedTemplate, appPatterns: patterns });
    };

    return (
        <Dialog open onOpenChange={() => onCancel()}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {template.name ? t('Edit Template') : t('Create Template')}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Typography.Title>{t('Name')}</Typography.Title>
                            <Input
                                value={editedTemplate.name}
                                onChange={(e) =>
                                    setEditedTemplate({ ...editedTemplate, name: e.target.value })
                                }
                                placeholder={t('e.g., Bug Report')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Typography.Title>{t('Category')}</Typography.Title>
                            <Select
                                value={editedTemplate.category}
                                onValueChange={(value) =>
                                    setEditedTemplate({ ...editedTemplate, category: value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(TEMPLATE_CATEGORIES).map(([key, { label, icon }]) => (
                                        <SelectItem key={key} value={key}>
                                            {icon} {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Typography.Title>{t('Language')}</Typography.Title>
                            <Select
                                value={editedTemplate.language}
                                onValueChange={(value) =>
                                    setEditedTemplate({ ...editedTemplate, language: value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fr">🇫🇷 Français</SelectItem>
                                    <SelectItem value="en">🇬🇧 English</SelectItem>
                                    <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                                    <SelectItem value="es">🇪🇸 Español</SelectItem>
                                    <SelectItem value="it">🇮🇹 Italiano</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Typography.Title>{t('ID')}</Typography.Title>
                            <Input
                                value={editedTemplate.id}
                                onChange={(e) =>
                                    setEditedTemplate({
                                        ...editedTemplate,
                                        id: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                                    })
                                }
                                placeholder={t('unique-id')}
                                className="font-mono text-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Typography.Title>{t('Trigger Words')}</Typography.Title>
                        <Input
                            value={editedTemplate.triggerWords.join(', ')}
                            onChange={(e) => handleTriggerWordsChange(e.target.value)}
                            placeholder={t('e.g., template bug, bug report, rapport bug')}
                        />
                        <Typography.Paragraph>
                            {t('Comma-separated phrases that activate this template when spoken')}
                        </Typography.Paragraph>
                    </div>

                    <div className="space-y-2">
                        <Typography.Title>{t('Compatible Apps')}</Typography.Title>
                        <Input
                            value={editedTemplate.appPatterns.join(', ')}
                            onChange={(e) => handleAppPatternsChange(e.target.value)}
                            placeholder={t('e.g., Discord, Slack, Jira (leave empty for all apps)')}
                        />
                        <Typography.Paragraph>
                            {t('Comma-separated list of apps where this template is available. Leave empty for all apps.')}
                        </Typography.Paragraph>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Typography.Title>{t('Template Content')}</Typography.Title>
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                            >
                                <Eye className="h-3 w-3" />
                                {showPreview ? t('Hide Preview') : t('Show Preview')}
                            </button>
                        </div>
                        {showPreview ? (
                            <div className="p-4 rounded-lg border bg-zinc-900/50 border-zinc-800 whitespace-pre-wrap font-mono text-sm text-zinc-300 min-h-[200px]">
                                {editedTemplate.content || t('No content')}
                            </div>
                        ) : (
                            <Textarea
                                value={editedTemplate.content}
                                onChange={(e) =>
                                    setEditedTemplate({ ...editedTemplate, content: e.target.value })
                                }
                                placeholder={t('Template content with [placeholders]...')}
                                className="h-[200px] font-mono text-sm"
                            />
                        )}
                        <Typography.Paragraph>
                            {t('Use [brackets] for placeholders that users need to fill in')}
                        </Typography.Paragraph>
                    </div>
                </div>

                <DialogFooter>
                    <Page.SecondaryButton variant="ghost" onClick={onCancel}>
                        {t('Cancel')}
                    </Page.SecondaryButton>
                    <Page.SecondaryButton
                        onClick={handleSave}
                        disabled={!editedTemplate.name || !editedTemplate.content || editedTemplate.triggerWords.length === 0}
                    >
                        {t('Save')}
                    </Page.SecondaryButton>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
