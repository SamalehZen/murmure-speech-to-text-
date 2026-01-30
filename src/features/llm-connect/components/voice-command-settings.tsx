import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { Typography } from '@/components/typography';
import { SettingsUI } from '@/components/settings-ui';
import { Page } from '@/components/page';
import { Switch } from '@/components/switch';
import { Input } from '@/components/input';
import { Textarea } from '@/components/textarea';
import { Button } from '@/components/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/select';
import {
    ChevronDown,
    ChevronUp,
    Pencil,
    Trash2,
    Plus,
    RotateCcw,
    FileText,
    X,
    Check,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
    VoiceCommand,
    VoiceCommandSettings as VoiceCommandSettingsType,
    CommandAction,
} from '../voice-commands.types';
import {
    COMMAND_CATEGORIES,
    CommandCategory,
    LIST_BULLET_OPTIONS,
    getActionPreview,
    DEFAULT_VOICE_COMMAND_SETTINGS,
} from '../voice-commands.constants';

interface CategorySectionProps {
    category: CommandCategory;
    commands: VoiceCommand[];
    onToggleCommand: (commandId: string, enabled: boolean) => void;
    onEditCommand: (command: VoiceCommand) => void;
    onDeleteCommand: (commandId: string) => void;
}

const CategorySection = ({
    category,
    commands,
    onToggleCommand,
    onEditCommand,
    onDeleteCommand,
}: CategorySectionProps) => {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(false);
    const categoryInfo = COMMAND_CATEGORIES[category];
    const enabledCount = commands.filter((c) => c.enabled).length;

    return (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-3 bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span>{categoryInfo.icon}</span>
                    <span className="font-medium">{t(categoryInfo.label)}</span>
                    <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                        {enabledCount}/{commands.length}
                    </span>
                </div>
                {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-zinc-400" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-zinc-400" />
                )}
            </button>

            {isExpanded && (
                <div className="p-2 space-y-2">
                    {commands.map((command) => (
                        <div
                            key={command.id}
                            className="flex items-center justify-between p-2 bg-zinc-900/30 rounded"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium truncate">
                                        {command.triggers[0]}
                                    </span>
                                    {command.triggers.length > 1 && (
                                        <span className="text-xs text-zinc-500">
                                            +{command.triggers.length - 1}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                                <code className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-400 whitespace-nowrap">
                                    {getActionPreview(command.action)}
                                </code>
                                <button
                                    onClick={() => onEditCommand(command)}
                                    className="p-1 text-zinc-400 hover:text-zinc-200"
                                    title={t('Edit')}
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </button>
                                {!command.id.startsWith('cmd-') && (
                                    <button
                                        onClick={() => onDeleteCommand(command.id)}
                                        className="p-1 text-zinc-400 hover:text-red-400"
                                        title={t('Delete')}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                )}
                                <Switch
                                    checked={command.enabled}
                                    onCheckedChange={(checked) =>
                                        onToggleCommand(command.id, checked)
                                    }
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

interface CommandEditorProps {
    command: VoiceCommand | null;
    onSave: (command: VoiceCommand) => void;
    onCancel: () => void;
    isNew: boolean;
}

const CommandEditor = ({ command, onSave, onCancel, isNew }: CommandEditorProps) => {
    const { t } = useTranslation();
    const [triggers, setTriggers] = useState(command?.triggers.join(', ') ?? '');
    const [category, setCategory] = useState<CommandCategory>(
        (command?.category as CommandCategory) ?? 'punctuation'
    );
    const [actionType, setActionType] = useState<'text' | 'special'>(
        command != null && typeof command.action === 'object' ? 'text' : 'special'
    );
    const [textValue, setTextValue] = useState(
        command != null && typeof command.action === 'object'
            ? command.action.insert_text
            : ''
    );
    const [specialAction, setSpecialAction] = useState<string>(
        command != null && typeof command.action === 'string'
            ? command.action
            : 'insert_newline'
    );

    const handleSave = () => {
        const triggerList = triggers
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t.length > 0);

        if (triggerList.length === 0) return;

        const action: CommandAction =
            actionType === 'text' ? { insert_text: textValue } : (specialAction as CommandAction);

        const newCommand: VoiceCommand = {
            id: command?.id ?? `custom-${Date.now()}`,
            triggers: triggerList,
            action,
            enabled: command?.enabled ?? true,
            category,
        };

        onSave(newCommand);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-zinc-900 rounded-lg p-6 w-full max-w-md mx-4 space-y-4">
                <div className="flex items-center justify-between">
                    <Typography.Title>
                        {isNew ? t('Add Command') : t('Edit Command')}
                    </Typography.Title>
                    <button onClick={onCancel} className="text-zinc-400 hover:text-zinc-200">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm text-zinc-400 block mb-1">
                            {t('Triggers (comma separated)')}
                        </label>
                        <Input
                            value={triggers}
                            onChange={(e) => setTriggers(e.target.value)}
                            placeholder="e.g., point, period"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-zinc-400 block mb-1">
                            {t('Category')}
                        </label>
                        <Select value={category} onValueChange={(v) => setCategory(v as CommandCategory)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(COMMAND_CATEGORIES).map(([key, { label, icon }]) => (
                                    <SelectItem key={key} value={key}>
                                        {icon} {t(label)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label className="text-sm text-zinc-400 block mb-1">
                            {t('Action Type')}
                        </label>
                        <Select value={actionType} onValueChange={(v) => setActionType(v as 'text' | 'special')}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="text">{t('Insert Text')}</SelectItem>
                                <SelectItem value="special">{t('Special Action')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {actionType === 'text' ? (
                        <div>
                            <label className="text-sm text-zinc-400 block mb-1">
                                {t('Text to Insert')}
                            </label>
                            <Input
                                value={textValue}
                                onChange={(e) => setTextValue(e.target.value)}
                                placeholder="e.g., ."
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="text-sm text-zinc-400 block mb-1">
                                {t('Action')}
                            </label>
                            <Select value={specialAction} onValueChange={setSpecialAction}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="insert_newline">{t('New Line')}</SelectItem>
                                    <SelectItem value="insert_paragraph">{t('New Paragraph')}</SelectItem>
                                    <SelectItem value="start_list">{t('Start List')}</SelectItem>
                                    <SelectItem value="end_list">{t('End List')}</SelectItem>
                                    <SelectItem value="list_item">{t('List Item')}</SelectItem>
                                    <SelectItem value="start_bold">{t('Start Bold')}</SelectItem>
                                    <SelectItem value="end_bold">{t('End Bold')}</SelectItem>
                                    <SelectItem value="start_italic">{t('Start Italic')}</SelectItem>
                                    <SelectItem value="end_italic">{t('End Italic')}</SelectItem>
                                    <SelectItem value="insert_signature">{t('Insert Signature')}</SelectItem>
                                    <SelectItem value="insert_date">{t('Insert Date')}</SelectItem>
                                    <SelectItem value="insert_time">{t('Insert Time')}</SelectItem>
                                    <SelectItem value="undo">{t('Undo')}</SelectItem>
                                    <SelectItem value="clear_all">{t('Clear All')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="ghost" onClick={onCancel}>
                        {t('Cancel')}
                    </Button>
                    <Button onClick={handleSave}>
                        <Check className="h-4 w-4 mr-1" />
                        {t('Save')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

interface CheatsheetModalProps {
    commands: VoiceCommand[];
    onClose: () => void;
}

const CheatsheetModal = ({ commands, onClose }: CheatsheetModalProps) => {
    const { t } = useTranslation();
    const enabledCommands = commands.filter((c) => c.enabled);
    const grouped = enabledCommands.reduce(
        (acc, cmd) => {
            const cat = cmd.category as CommandCategory;
            if (acc[cat] === undefined) acc[cat] = [];
            acc[cat].push(cmd);
            return acc;
        },
        {} as Record<CommandCategory, VoiceCommand[]>
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-zinc-900 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <Typography.Title>{t('Voice Commands Cheatsheet')}</Typography.Title>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-4 text-sm">
                    {(Object.entries(grouped) as [CommandCategory, VoiceCommand[]][]).map(
                        ([category, cmds]) => (
                            <div key={category}>
                                <div className="font-medium text-zinc-300 mb-2">
                                    {COMMAND_CATEGORIES[category].icon}{' '}
                                    {t(COMMAND_CATEGORIES[category].label)}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {cmds.map((cmd) => (
                                        <div
                                            key={cmd.id}
                                            className="flex items-center justify-between bg-zinc-800/50 rounded px-2 py-1"
                                        >
                                            <span className="text-zinc-400">{cmd.triggers[0]}</span>
                                            <code className="text-zinc-500">
                                                {getActionPreview(cmd.action)}
                                            </code>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-800">
                    <Button variant="outline" onClick={() => window.print()}>
                        {t('Print')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export const VoiceCommandSettingsComponent = () => {
    const { t } = useTranslation();
    const [settings, setSettings] = useState<VoiceCommandSettingsType>(
        DEFAULT_VOICE_COMMAND_SETTINGS
    );
    const [editingCommand, setEditingCommand] = useState<VoiceCommand | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [showCheatsheet, setShowCheatsheet] = useState(false);
    const [previewInput, setPreviewInput] = useState('');
    const [previewOutput, setPreviewOutput] = useState('');

    useEffect(() => {
        loadSettings();
        const unlisten = listen<VoiceCommandSettingsType>('voice-commands-updated', (event) => {
            setSettings(event.payload);
        });
        return () => {
            unlisten.then((fn) => fn());
        };
    }, []);

    const loadSettings = async () => {
        try {
            const loaded = await invoke<VoiceCommandSettingsType>('get_voice_command_settings');
            setSettings(loaded);
        } catch (error) {
            console.error('Failed to load voice command settings:', error);
        }
    };

    const saveSettings = async (newSettings: VoiceCommandSettingsType) => {
        try {
            await invoke('set_voice_command_settings', { settings: newSettings });
            setSettings(newSettings);
        } catch (error) {
            console.error('Failed to save voice command settings:', error);
        }
    };

    const handleToggleEnabled = async (enabled: boolean) => {
        const newSettings = { ...settings, enabled };
        await saveSettings(newSettings);
    };

    const handleToggleCommand = async (commandId: string, enabled: boolean) => {
        const newSettings = {
            ...settings,
            commands: settings.commands.map((c) =>
                c.id === commandId ? { ...c, enabled } : c
            ),
        };
        await saveSettings(newSettings);
    };

    const handleSaveCommand = async (command: VoiceCommand) => {
        const existing = settings.commands.find((c) => c.id === command.id);
        let newCommands: VoiceCommand[];

        if (existing != null) {
            newCommands = settings.commands.map((c) =>
                c.id === command.id ? command : c
            );
        } else {
            newCommands = [...settings.commands, command];
        }

        const newSettings = { ...settings, commands: newCommands };
        await saveSettings(newSettings);
        setEditingCommand(null);
        setIsCreating(false);
    };

    const handleDeleteCommand = async (commandId: string) => {
        const newSettings = {
            ...settings,
            commands: settings.commands.filter((c) => c.id !== commandId),
        };
        await saveSettings(newSettings);
    };

    const handleResetToDefault = async () => {
        try {
            await invoke('reset_voice_commands_to_default');
        } catch (error) {
            console.error('Failed to reset voice commands:', error);
        }
    };

    const handlePreview = async () => {
        if (previewInput.trim().length === 0) return;
        try {
            const result = await invoke<string>('preview_voice_commands', {
                text: previewInput,
                settings,
            });
            setPreviewOutput(result);
        } catch (error) {
            console.error('Failed to preview:', error);
        }
    };

    const commandsByCategory = settings.commands.reduce(
        (acc, cmd) => {
            const cat = cmd.category as CommandCategory;
            if (acc[cat] === undefined) acc[cat] = [];
            acc[cat].push(cmd);
            return acc;
        },
        {} as Record<CommandCategory, VoiceCommand[]>
    );

    return (
        <SettingsUI.Container className="mb-6">
            <SettingsUI.Item>
                <SettingsUI.Description>
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-violet-400" />
                        <Typography.Title>{t('Voice Commands')}</Typography.Title>
                    </div>
                    <Typography.Paragraph>
                        {t(
                            'Control formatting and insert special elements with voice commands during dictation.'
                        )}
                    </Typography.Paragraph>
                </SettingsUI.Description>
                <Switch checked={settings.enabled} onCheckedChange={handleToggleEnabled} />
            </SettingsUI.Item>

            {settings.enabled && (
                <>
                    <SettingsUI.Separator />

                    <div className="px-4 py-3">
                        <div className="flex items-center justify-between mb-3">
                            <Typography.Title>{t('Commands')}</Typography.Title>
                            <div className="flex gap-2">
                                <Page.SecondaryButton
                                    size="sm"
                                    onClick={() => setShowCheatsheet(true)}
                                >
                                    <FileText className="h-4 w-4 mr-1" />
                                    {t('Cheatsheet')}
                                </Page.SecondaryButton>
                                <Page.SecondaryButton
                                    size="sm"
                                    onClick={handleResetToDefault}
                                >
                                    <RotateCcw className="h-4 w-4 mr-1" />
                                    {t('Reset')}
                                </Page.SecondaryButton>
                                <Page.SecondaryButton
                                    size="sm"
                                    onClick={() => {
                                        setEditingCommand(null);
                                        setIsCreating(true);
                                    }}
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    {t('Add')}
                                </Page.SecondaryButton>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {(Object.keys(COMMAND_CATEGORIES) as CommandCategory[]).map(
                                (category) =>
                                    commandsByCategory[category] !== undefined &&
                                    commandsByCategory[category].length > 0 && (
                                        <CategorySection
                                            key={category}
                                            category={category}
                                            commands={commandsByCategory[category]}
                                            onToggleCommand={handleToggleCommand}
                                            onEditCommand={setEditingCommand}
                                            onDeleteCommand={handleDeleteCommand}
                                        />
                                    )
                            )}
                        </div>
                    </div>

                    <SettingsUI.Separator />

                    <div className="px-4 py-3">
                        <Typography.Title className="mb-3">{t('Options')}</Typography.Title>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-medium">{t('Signature')}</div>
                                    <div className="text-xs text-zinc-500">
                                        {t('Text to insert when you say "signature"')}
                                    </div>
                                </div>
                                <Textarea
                                    value={settings.signature.text}
                                    onChange={(e) =>
                                        saveSettings({
                                            ...settings,
                                            signature: { ...settings.signature, text: e.target.value },
                                        })
                                    }
                                    placeholder={t('Your signature here...')}
                                    rows={2}
                                    className="w-64"
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-medium">{t('List Bullet Style')}</div>
                                    <div className="text-xs text-zinc-500">
                                        {t('Character used for bullet points in lists')}
                                    </div>
                                </div>
                                <Select
                                    value={settings.list_bullet}
                                    onValueChange={(value) =>
                                        saveSettings({ ...settings, list_bullet: value })
                                    }
                                >
                                    <SelectTrigger className="w-[120px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {LIST_BULLET_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-medium">{t('Markdown Mode')}</div>
                                    <div className="text-xs text-zinc-500">
                                        {t('Use markdown syntax for bold (**) and italic (*)')}
                                    </div>
                                </div>
                                <Switch
                                    checked={settings.markdown_mode}
                                    onCheckedChange={(checked) =>
                                        saveSettings({ ...settings, markdown_mode: checked })
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    <SettingsUI.Separator />

                    <div className="px-4 py-3">
                        <Typography.Title className="mb-3">{t('Preview')}</Typography.Title>
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <Input
                                    value={previewInput}
                                    onChange={(e) => setPreviewInput(e.target.value)}
                                    placeholder={t('Type text with commands to preview...')}
                                    className="flex-1"
                                />
                                <Button onClick={handlePreview}>{t('Test')}</Button>
                            </div>
                            {previewOutput.length > 0 && (
                                <div className="bg-zinc-800 rounded p-3 text-sm font-mono whitespace-pre-wrap">
                                    {previewOutput}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {(editingCommand != null || isCreating) && (
                <CommandEditor
                    command={editingCommand}
                    onSave={handleSaveCommand}
                    onCancel={() => {
                        setEditingCommand(null);
                        setIsCreating(false);
                    }}
                    isNew={isCreating}
                />
            )}

            {showCheatsheet && (
                <CheatsheetModal
                    commands={settings.commands}
                    onClose={() => setShowCheatsheet(false)}
                />
            )}
        </SettingsUI.Container>
    );
};

export { VoiceCommandSettingsComponent as VoiceCommandSettings };
