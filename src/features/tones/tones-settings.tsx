import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from '@/i18n';
import { toast } from 'react-toastify';
import clsx from 'clsx';
import {
    Plus,
    Pencil,
    Trash2,
    Globe,
    AppWindow,
    Star,
    Crosshair,
} from 'lucide-react';
import { Input } from '@/components/input';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/dialog';
import { Page } from '@/components/page';
import { Tone, RegisteredApp, AppMatcher } from '../hooks/use-tones';

interface CurrentContext {
    appName: string;
    windowTitle: string;
    browserContext: {
        url: string | null;
        domain: string | null;
        browser: string | null;
    };
}

interface RegisteredItemProps {
    item: RegisteredApp;
    tone: Tone | undefined;
    onEdit: () => void;
    onDelete: () => void;
}

function RegisteredItem({ item, tone, onEdit, onDelete }: RegisteredItemProps) {
    const { t } = useTranslation();
    const isApp = item.matcher.type === 'app';
    const matcherDisplay = isApp
        ? item.matcher.app_name
        : item.matcher.pattern;

    return (
        <div className="flex items-center justify-between p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg">
            <div className="flex items-center gap-3">
                {isApp ? (
                    <AppWindow className="w-5 h-5 text-blue-400" />
                ) : (
                    <Globe className="w-5 h-5 text-green-400" />
                )}
                <div>
                    <div className="font-medium text-zinc-200">
                        {item.display_name}
                    </div>
                    <div className="text-sm text-zinc-500">
                        {isApp ? t('App') : t('Domain')}: {matcherDisplay}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className="px-2 py-1 text-xs bg-zinc-700 rounded text-zinc-300">
                    {tone?.icon} {tone?.name || t('Unknown')}
                </span>
                <button
                    className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200"
                    onClick={onEdit}
                >
                    <Pencil className="w-4 h-4" />
                </button>
                <button
                    className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-red-400"
                    onClick={onDelete}
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

interface ToneItemProps {
    tone: Tone;
    isDefault: boolean;
    onSetDefault: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

function ToneItem({
    tone,
    isDefault,
    onSetDefault,
    onEdit,
    onDelete,
}: ToneItemProps) {
    const { t } = useTranslation();

    return (
        <div
            className={clsx(
                'flex items-center justify-between p-3 border rounded-lg',
                isDefault
                    ? 'bg-sky-900/30 border-sky-600'
                    : 'bg-zinc-800/50 border-zinc-700'
            )}
        >
            <div className="flex items-center gap-3">
                <span className="text-xl">{tone.icon || '📝'}</span>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-200">
                            {tone.name}
                        </span>
                        {isDefault && (
                            <span className="px-1.5 py-0.5 text-xs bg-sky-600 rounded text-white">
                                {t('Default')}
                            </span>
                        )}
                        {tone.is_system && (
                            <span className="px-1.5 py-0.5 text-xs bg-zinc-600 rounded text-zinc-300">
                                {t('System')}
                            </span>
                        )}
                    </div>
                    <div className="text-sm text-zinc-500">
                        {tone.model || t('No model selected')}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-1">
                {!isDefault && (
                    <button
                        className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-yellow-400"
                        onClick={onSetDefault}
                        title={t('Set as default')}
                    >
                        <Star className="w-4 h-4" />
                    </button>
                )}
                <button
                    className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200"
                    onClick={onEdit}
                >
                    <Pencil className="w-4 h-4" />
                </button>
                {!tone.is_system && (
                    <button
                        className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-red-400"
                        onClick={onDelete}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

interface AddMatcherDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (
        matcher: AppMatcher,
        displayName: string,
        toneId: string
    ) => void;
    tones: Tone[];
    editItem?: RegisteredApp;
    initialContext?: CurrentContext | null;
}

function AddMatcherDialog({
    open,
    onClose,
    onSave,
    tones,
    editItem,
    initialContext,
}: AddMatcherDialogProps) {
    const { t } = useTranslation();

    const getInitialMatcherType = (): 'app' | 'domain' => {
        if (editItem) return editItem.matcher.type;
        if (initialContext?.browserContext?.domain) return 'domain';
        return 'app';
    };

    const getInitialAppName = (): string => {
        if (editItem?.matcher.type === 'app') return editItem.matcher.app_name || '';
        if (initialContext?.appName) return initialContext.appName;
        return '';
    };

    const getInitialDomainPattern = (): string => {
        if (editItem?.matcher.type === 'domain') return editItem.matcher.pattern || '';
        if (initialContext?.browserContext?.domain) return initialContext.browserContext.domain;
        return '';
    };

    const getInitialDisplayName = (): string => {
        if (editItem) return editItem.display_name;
        if (initialContext?.browserContext?.domain) return initialContext.browserContext.domain;
        if (initialContext?.appName) return initialContext.appName;
        return '';
    };

    const [matcherType, setMatcherType] = useState<'app' | 'domain'>(getInitialMatcherType());
    const [appName, setAppName] = useState(getInitialAppName());
    const [domainPattern, setDomainPattern] = useState(getInitialDomainPattern());
    const [displayName, setDisplayName] = useState(getInitialDisplayName());
    const [toneId, setToneId] = useState(editItem?.tone_id || tones[0]?.id || '');

    useEffect(() => {
        if (open) {
            setMatcherType(getInitialMatcherType());
            setAppName(getInitialAppName());
            setDomainPattern(getInitialDomainPattern());
            setDisplayName(getInitialDisplayName());
            setToneId(editItem?.tone_id || tones[0]?.id || '');
        }
    }, [open, editItem, initialContext]);

    const handleSave = () => {
        if (matcherType === 'app' && !appName.trim()) {
            toast.error(t('App name is required'));
            return;
        }
        if (matcherType === 'domain' && !domainPattern.trim()) {
            toast.error(t('Domain pattern is required'));
            return;
        }
        if (!displayName.trim()) {
            toast.error(t('Display name is required'));
            return;
        }
        if (!toneId) {
            toast.error(t('Please select a tone'));
            return;
        }

        const matcher: AppMatcher =
            matcherType === 'app'
                ? { type: 'app', app_name: appName.trim() }
                : { type: 'domain', pattern: domainPattern.trim() };

        onSave(matcher, displayName.trim(), toneId);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {editItem
                            ? t('Edit App/Domain')
                            : t('Add App or Domain')}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex gap-2">
                        <button
                            className={clsx(
                                'flex-1 py-2 px-4 rounded border transition-colors',
                                matcherType === 'app'
                                    ? 'bg-sky-600 border-sky-500 text-white'
                                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                            )}
                            onClick={() => setMatcherType('app')}
                        >
                            <AppWindow className="w-4 h-4 inline mr-2" />
                            {t('Application')}
                        </button>
                        <button
                            className={clsx(
                                'flex-1 py-2 px-4 rounded border transition-colors',
                                matcherType === 'domain'
                                    ? 'bg-sky-600 border-sky-500 text-white'
                                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                            )}
                            onClick={() => setMatcherType('domain')}
                        >
                            <Globe className="w-4 h-4 inline mr-2" />
                            {t('Domain')}
                        </button>
                    </div>

                    {matcherType === 'app' ? (
                        <div>
                            <label className="block text-sm text-zinc-400 mb-1">
                                {t('Application Name')}
                            </label>
                            <Input
                                placeholder={t(
                                    'e.g., Microsoft Outlook, VS Code'
                                )}
                                value={appName}
                                onChange={(e) => setAppName(e.target.value)}
                            />
                            <p className="text-xs text-zinc-500 mt-1">
                                {t(
                                    'Partial match supported (e.g., "Outlook" matches "Microsoft Outlook")'
                                )}
                            </p>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm text-zinc-400 mb-1">
                                {t('Domain Pattern')}
                            </label>
                            <Input
                                placeholder={t(
                                    'e.g., mail.google.com or *.github.com'
                                )}
                                value={domainPattern}
                                onChange={(e) =>
                                    setDomainPattern(e.target.value)
                                }
                            />
                            <p className="text-xs text-zinc-500 mt-1">
                                {t(
                                    'Use *.domain.com for wildcard matching'
                                )}
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm text-zinc-400 mb-1">
                            {t('Display Name')}
                        </label>
                        <Input
                            placeholder={t('e.g., Work Email, GitHub')}
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-400 mb-1">
                            {t('Tone')}
                        </label>
                        <select
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-200"
                            value={toneId}
                            onChange={(e) => setToneId(e.target.value)}
                        >
                            {tones.map((tone) => (
                                <option key={tone.id} value={tone.id}>
                                    {tone.icon} {tone.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <DialogFooter className="dark">
                    <Page.SecondaryButton variant="ghost" onClick={onClose}>
                        {t('Cancel')}
                    </Page.SecondaryButton>
                    <Page.SecondaryButton onClick={handleSave}>
                        {t('Save')}
                    </Page.SecondaryButton>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface EditToneDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (updates: Partial<Tone>) => void;
    tone: Tone | null;
    models: Array<{ name: string }>;
}

function EditToneDialog({
    open,
    onClose,
    onSave,
    tone,
    models,
}: EditToneDialogProps) {
    const { t } = useTranslation();
    const [name, setName] = useState(tone?.name || '');
    const [model, setModel] = useState(tone?.model || '');
    const [prompt, setPrompt] = useState(tone?.prompt || '');
    const [icon, setIcon] = useState(tone?.icon || '');

    useEffect(() => {
        if (open) {
            setName(tone?.name || '');
            setModel(tone?.model || '');
            setPrompt(tone?.prompt || '');
            setIcon(tone?.icon || '');
        }
    }, [open, tone]);

    const handleSave = () => {
        if (!name.trim()) {
            toast.error(t('Name is required'));
            return;
        }

        onSave({
            name: name.trim(),
            model,
            prompt,
            icon: icon || null,
        });
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{t('Edit Tone')}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex gap-4">
                        <div className="w-20">
                            <label className="block text-sm text-zinc-400 mb-1">
                                {t('Icon')}
                            </label>
                            <Input
                                placeholder="📝"
                                value={icon}
                                onChange={(e) => setIcon(e.target.value)}
                                className="text-center text-xl"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm text-zinc-400 mb-1">
                                {t('Name')}
                            </label>
                            <Input
                                placeholder={t('Tone name')}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={tone?.is_system}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-400 mb-1">
                            {t('Model')}
                        </label>
                        <select
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-200"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                        >
                            <option value="">{t('Select a model')}</option>
                            {models.map((m) => (
                                <option key={m.name} value={m.name}>
                                    {m.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-400 mb-1">
                            {t('Prompt Template')}
                        </label>
                        <textarea
                            className="w-full h-48 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-200 font-mono text-sm resize-none"
                            placeholder={t('Enter prompt template...')}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                        <p className="text-xs text-zinc-500 mt-1">
                            {t(
                                'Available variables: {{TRANSCRIPT}}, {{DICTIONARY}}, {{BROWSER_URL}}, {{BROWSER_DOMAIN}}, {{WINDOW_TITLE}}, {{APP_NAME}}'
                            )}
                        </p>
                    </div>
                </div>

                <DialogFooter className="dark">
                    <Page.SecondaryButton variant="ghost" onClick={onClose}>
                        {t('Cancel')}
                    </Page.SecondaryButton>
                    <Page.SecondaryButton onClick={handleSave}>
                        {t('Save')}
                    </Page.SecondaryButton>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface TonesSettingsProps {
    tones: Tone[];
    registeredApps: RegisteredApp[];
    defaultToneId: string | null;
    models: Array<{ name: string }>;
    onAddTone: (tone: Omit<Tone, 'id'>) => Promise<Tone>;
    onUpdateTone: (id: string, updates: Partial<Tone>) => Promise<void>;
    onDeleteTone: (id: string) => Promise<void>;
    onAddRegisteredApp: (
        matcher: AppMatcher,
        displayName: string,
        toneId: string
    ) => Promise<void>;
    onUpdateRegisteredApp: (
        id: string,
        updates: Partial<RegisteredApp>
    ) => Promise<void>;
    onDeleteRegisteredApp: (id: string) => Promise<void>;
    onSetDefaultTone: (toneId: string) => Promise<void>;
}

export function TonesSettings({
    tones,
    registeredApps,
    defaultToneId,
    models,
    onAddTone,
    onUpdateTone,
    onDeleteTone,
    onAddRegisteredApp,
    onUpdateRegisteredApp,
    onDeleteRegisteredApp,
    onSetDefaultTone,
}: TonesSettingsProps) {
    const { t } = useTranslation();
    const [matcherDialogOpen, setMatcherDialogOpen] = useState(false);
    const [editMatcherItem, setEditMatcherItem] = useState<
        RegisteredApp | undefined
    >();
    const [toneDialogOpen, setToneDialogOpen] = useState(false);
    const [editTone, setEditTone] = useState<Tone | null>(null);
    const [currentContext, setCurrentContext] = useState<CurrentContext | null>(
        null
    );

    const handleAddMatcher = () => {
        setEditMatcherItem(undefined);
        setCurrentContext(null);
        setMatcherDialogOpen(true);
    };

    const handleQuickRegister = async () => {
        try {
            const context = await invoke<CurrentContext | null>(
                'get_active_context'
            );
            if (context) {
                setCurrentContext(context);
                setEditMatcherItem(undefined);
                setMatcherDialogOpen(true);
            } else {
                toast.error(t('Could not detect current app'));
            }
        } catch {
            toast.error(t('Failed to get current context'));
        }
    };

    const handleEditMatcher = (item: RegisteredApp) => {
        setEditMatcherItem(item);
        setMatcherDialogOpen(true);
    };

    const handleSaveMatcher = async (
        matcher: AppMatcher,
        displayName: string,
        toneId: string
    ) => {
        try {
            if (editMatcherItem) {
                await onUpdateRegisteredApp(editMatcherItem.id, {
                    matcher,
                    display_name: displayName,
                    tone_id: toneId,
                });
                toast.success(t('App/Domain updated'));
            } else {
                await onAddRegisteredApp(matcher, displayName, toneId);
                toast.success(t('App/Domain added'));
            }
        } catch {
            toast.error(t('Failed to save'));
        }
    };

    const handleDeleteMatcher = async (id: string) => {
        try {
            await onDeleteRegisteredApp(id);
            toast.success(t('App/Domain deleted'));
        } catch {
            toast.error(t('Failed to delete'));
        }
    };

    const handleEditTone = (tone: Tone) => {
        setEditTone(tone);
        setToneDialogOpen(true);
    };

    const handleAddTone = () => {
        setEditTone(null);
        setToneDialogOpen(true);
    };

    const handleSaveTone = async (updates: Partial<Tone>) => {
        try {
            if (editTone) {
                await onUpdateTone(editTone.id, updates);
                toast.success(t('Tone updated'));
            } else {
                await onAddTone({
                    name: updates.name || 'New Tone',
                    prompt: updates.prompt || '',
                    model: updates.model || '',
                    is_system: false,
                    icon: updates.icon || null,
                });
                toast.success(t('Tone created'));
            }
        } catch {
            toast.error(t('Failed to save tone'));
        }
    };

    const handleDeleteTone = async (id: string) => {
        try {
            await onDeleteTone(id);
            toast.success(t('Tone deleted'));
        } catch {
            toast.error(t('Cannot delete this tone'));
        }
    };

    const getToneById = (id: string) => tones.find((t) => t.id === id);

    return (
        <div className="space-y-6">
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-zinc-200">
                        {t('Writing Tones')}
                    </h3>
                    <button
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-sky-600 hover:bg-sky-500 rounded text-white transition-colors"
                        onClick={handleAddTone}
                    >
                        <Plus className="w-4 h-4" />
                        {t('Add Tone')}
                    </button>
                </div>
                <p className="text-sm text-zinc-500 mb-4">
                    {t(
                        'Tones define how your transcription is processed. Each tone has its own prompt and model.'
                    )}
                </p>
                <div className="space-y-2">
                    {tones.map((tone) => (
                        <ToneItem
                            key={tone.id}
                            tone={tone}
                            isDefault={tone.id === defaultToneId}
                            onSetDefault={() => onSetDefaultTone(tone.id)}
                            onEdit={() => handleEditTone(tone)}
                            onDelete={() => handleDeleteTone(tone.id)}
                        />
                    ))}
                </div>
            </div>

            <div className="border-t border-zinc-700 pt-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-zinc-200">
                        {t('Registered Apps & Domains')}
                    </h3>
                    <div className="flex items-center gap-2">
                    <button
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-200 transition-colors"
                        onClick={handleQuickRegister}
                        title={t('Register current app or domain')}
                    >
                        <Crosshair className="w-4 h-4" />
                        {t('Quick Register')}
                    </button>
                    <button
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-sky-600 hover:bg-sky-500 rounded text-white transition-colors"
                        onClick={handleAddMatcher}
                    >
                        <Plus className="w-4 h-4" />
                        {t('Add')}
                    </button>
                </div>
                </div>
                <p className="text-sm text-zinc-500 mb-4">
                    {t(
                        'Automatically apply tones based on the active app or browser domain. Domain matches take priority over app matches.'
                    )}
                </p>

                {registeredApps.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 bg-zinc-800/30 rounded-lg border border-zinc-700 border-dashed">
                        {t(
                            'No apps or domains registered. Add one to automatically apply tones.'
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {registeredApps.map((item) => (
                            <RegisteredItem
                                key={item.id}
                                item={item}
                                tone={getToneById(item.tone_id)}
                                onEdit={() => handleEditMatcher(item)}
                                onDelete={() => handleDeleteMatcher(item.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            <AddMatcherDialog
                open={matcherDialogOpen}
                onClose={() => {
                    setMatcherDialogOpen(false);
                    setCurrentContext(null);
                }}
                onSave={handleSaveMatcher}
                tones={tones}
                editItem={editMatcherItem}
                initialContext={currentContext}
            />

            <EditToneDialog
                open={toneDialogOpen}
                onClose={() => setToneDialogOpen(false)}
                onSave={handleSaveTone}
                tone={editTone}
                models={models}
            />
        </div>
    );
}
