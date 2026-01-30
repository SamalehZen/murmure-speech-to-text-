import { useState } from 'react';
import { useTranslation } from '@/i18n';
import { Typography } from '@/components/typography';
import { SettingsUI } from '@/components/settings-ui';
import { Page } from '@/components/page';
import { TextTemplate, TemplateSettings as TemplateSettingsType } from '../llm-connect.types';
import { TemplateEditor } from './template-editor';
import { DEFAULT_TEMPLATES, TEMPLATE_CATEGORIES, TemplateCategory } from '../templates.constants';
import {
    Plus,
    Pencil,
    Trash2,
    Copy,
    Download,
    Upload,
    RotateCcw,
    Search,
    Filter,
} from 'lucide-react';
import { Switch } from '@/components/switch';
import { Input } from '@/components/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/select';
import { invoke } from '@tauri-apps/api/core';

interface TemplateSettingsProps {
    settings: TemplateSettingsType;
    onRefresh: () => void;
}

export const TemplateSettings = ({ settings, onRefresh }: TemplateSettingsProps) => {
    const { t } = useTranslation();
    const [editingTemplate, setEditingTemplate] = useState<TextTemplate | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [languageFilter, setLanguageFilter] = useState<string>('all');

    const effectiveTemplates = settings.templates.length > 0 ? settings.templates : DEFAULT_TEMPLATES;

    const filteredTemplates = effectiveTemplates.filter((template) => {
        const matchesSearch =
            searchQuery.length === 0 ||
            template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            template.triggerWords.some((tw) =>
                tw.toLowerCase().includes(searchQuery.toLowerCase())
            );
        const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
        const matchesLanguage = languageFilter === 'all' || template.language === languageFilter;
        return matchesSearch && matchesCategory && matchesLanguage;
    });

    const handleToggleEnabled = async (enabled: boolean) => {
        try {
            await invoke('toggle_templates', { enabled });
            onRefresh();
        } catch (error) {
            console.error('Failed to toggle templates:', error);
        }
    };

    const handleAddTemplate = () => {
        setIsCreating(true);
        setEditingTemplate({
            id: `template-${Date.now()}`,
            name: '',
            triggerWords: [],
            content: '',
            appPatterns: [],
            category: 'notes',
            language: 'fr',
        });
    };

    const handleSaveTemplate = async (template: TextTemplate) => {
        try {
            const updatedTemplates = isCreating
                ? [...effectiveTemplates, template]
                : effectiveTemplates.map((t) => (t.id === template.id ? template : t));

            await invoke('set_templates', { templates: updatedTemplates });
            onRefresh();
        } catch (error) {
            console.error('Failed to save template:', error);
        }
        setEditingTemplate(null);
        setIsCreating(false);
    };

    const handleDeleteTemplate = async (id: string) => {
        try {
            await invoke('delete_template', { templateId: id });
            onRefresh();
        } catch (error) {
            console.error('Failed to delete template:', error);
        }
    };

    const handleDuplicateTemplate = (template: TextTemplate) => {
        setIsCreating(true);
        setEditingTemplate({
            ...template,
            id: `${template.id}-copy-${Date.now()}`,
            name: `${template.name} (${t('Copy')})`,
        });
    };

    const handleResetToDefaults = async () => {
        try {
            await invoke('reset_templates_to_default');
            onRefresh();
        } catch (error) {
            console.error('Failed to reset templates:', error);
        }
    };

    const handleExport = async () => {
        try {
            const json = await invoke<string>('export_templates');
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'murmure-templates.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export templates:', error);
        }
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file != null) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        const content = event.target?.result as string;
                        await invoke('import_templates', { jsonContent: content, replace: false });
                        onRefresh();
                    } catch (error) {
                        console.error('Failed to import templates:', error);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    const getCategoryIcon = (category: string): string => {
        return TEMPLATE_CATEGORIES[category as TemplateCategory]?.icon ?? '📄';
    };

    const getCategoryLabel = (category: string): string => {
        return TEMPLATE_CATEGORIES[category as TemplateCategory]?.label ?? category;
    };

    const uniqueLanguages = [...new Set(effectiveTemplates.map((t) => t.language))];

    return (
        <SettingsUI.Container className="mb-6">
            <SettingsUI.Item>
                <SettingsUI.Description>
                    <Typography.Title>{t('Voice Templates')}</Typography.Title>
                    <Typography.Paragraph>
                        {t('Predefined text templates activated by voice keywords')}
                    </Typography.Paragraph>
                </SettingsUI.Description>
                <Switch checked={settings.enabled} onCheckedChange={handleToggleEnabled} />
            </SettingsUI.Item>

            {settings.enabled && (
                <>
                    <SettingsUI.Separator />

                    <div className="px-4 py-3">
                        <div className="flex items-center justify-between mb-4">
                            <Typography.Title>{t('Template Library')}</Typography.Title>
                            <div className="flex items-center gap-2">
                                <Page.SecondaryButton size="sm" onClick={handleImport}>
                                    <Upload className="h-4 w-4 mr-1" />
                                    {t('Import')}
                                </Page.SecondaryButton>
                                <Page.SecondaryButton size="sm" onClick={handleExport}>
                                    <Download className="h-4 w-4 mr-1" />
                                    {t('Export')}
                                </Page.SecondaryButton>
                                <Page.SecondaryButton size="sm" onClick={handleResetToDefaults}>
                                    <RotateCcw className="h-4 w-4 mr-1" />
                                    {t('Reset')}
                                </Page.SecondaryButton>
                                <Page.SecondaryButton size="sm" onClick={handleAddTemplate}>
                                    <Plus className="h-4 w-4 mr-1" />
                                    {t('Add')}
                                </Page.SecondaryButton>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t('Search templates...')}
                                    className="pl-9"
                                />
                            </div>
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="w-[150px]">
                                    <Filter className="h-4 w-4 mr-2" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Categories')}</SelectItem>
                                    {Object.entries(TEMPLATE_CATEGORIES).map(([key, { label, icon }]) => (
                                        <SelectItem key={key} value={key}>
                                            {icon} {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={languageFilter} onValueChange={setLanguageFilter}>
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Languages')}</SelectItem>
                                    {uniqueLanguages.map((lang) => (
                                        <SelectItem key={lang} value={lang}>
                                            {lang === 'fr' ? '🇫🇷 FR' : lang === 'en' ? '🇬🇧 EN' : lang.toUpperCase()}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                            {filteredTemplates.length === 0 ? (
                                <div className="text-center py-8 text-zinc-500">
                                    {searchQuery.length > 0 || categoryFilter !== 'all' || languageFilter !== 'all'
                                        ? t('No templates match your filters')
                                        : t('No templates yet. Add one to get started!')}
                                </div>
                            ) : (
                                filteredTemplates.map((template) => (
                                    <div
                                        key={template.id}
                                        className="flex items-start gap-3 p-3 rounded-lg border bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors"
                                    >
                                        <span className="text-2xl mt-0.5">
                                            {getCategoryIcon(template.category)}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium text-zinc-200">
                                                    {template.name}
                                                </span>
                                                <span className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                                                    {getCategoryLabel(template.category)}
                                                </span>
                                                <span className="text-xs text-zinc-500">
                                                    {template.language === 'fr' ? '🇫🇷' : template.language === 'en' ? '🇬🇧' : template.language.toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {template.triggerWords.slice(0, 3).map((word, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="text-xs text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded"
                                                    >
                                                        "{word}"
                                                    </span>
                                                ))}
                                                {template.triggerWords.length > 3 && (
                                                    <span className="text-xs text-zinc-500">
                                                        +{template.triggerWords.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                            {template.appPatterns.length > 0 && (
                                                <div className="text-xs text-zinc-600 mt-1 truncate">
                                                    {template.appPatterns.slice(0, 3).join(', ')}
                                                    {template.appPatterns.length > 3 &&
                                                        ` +${template.appPatterns.length - 3}`}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleDuplicateTemplate(template)}
                                                className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
                                                title={t('Duplicate')}
                                            >
                                                <Copy className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsCreating(false);
                                                    setEditingTemplate(template);
                                                }}
                                                className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
                                                title={t('Edit')}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTemplate(template.id)}
                                                className="p-1.5 text-zinc-400 hover:text-red-400 transition-colors"
                                                title={t('Delete')}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <SettingsUI.Separator />

                    <SettingsUI.Item>
                        <SettingsUI.Description>
                            <Typography.Title>{t('Trigger Prefix')}</Typography.Title>
                            <Typography.Paragraph>
                                {t('Optional prefix required before trigger words (e.g., "template")')}
                            </Typography.Paragraph>
                        </SettingsUI.Description>
                        <Input
                            value={settings.triggerPrefix ?? ''}
                            onChange={async (e) => {
                                const prefix = e.target.value || undefined;
                                try {
                                    await invoke('set_template_trigger_prefix', { prefix });
                                    onRefresh();
                                } catch (error) {
                                    console.error('Failed to set trigger prefix:', error);
                                }
                            }}
                            placeholder={t('e.g., template, modèle')}
                            className="w-[200px]"
                        />
                    </SettingsUI.Item>
                </>
            )}

            {editingTemplate != null && (
                <TemplateEditor
                    template={editingTemplate}
                    onSave={handleSaveTemplate}
                    onCancel={() => {
                        setEditingTemplate(null);
                        setIsCreating(false);
                    }}
                />
            )}
        </SettingsUI.Container>
    );
};
