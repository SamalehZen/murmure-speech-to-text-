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
import { AppDictionary, DictionaryTerm } from '../llm-connect.types';
import { Plus, Trash2, CheckCircle2, XCircle } from 'lucide-react';

interface AppDictionaryEditorProps {
    dictionary: AppDictionary;
    onSave: (dictionary: AppDictionary) => void;
    onCancel: () => void;
    onTestTerm: (spoken: string, dictionaryId: string) => Promise<string | null>;
}

export const AppDictionaryEditor = ({
    dictionary,
    onSave,
    onCancel,
    onTestTerm,
}: AppDictionaryEditorProps) => {
    const { t } = useTranslation();
    const [editedDictionary, setEditedDictionary] = useState<AppDictionary>(dictionary);
    const [newTerm, setNewTerm] = useState<DictionaryTerm>({
        spoken: [''],
        written: '',
        context: undefined,
    });
    const [testInput, setTestInput] = useState('');
    const [testResult, setTestResult] = useState<{ success: boolean; result: string | null } | null>(
        null
    );

    const handleSave = () => {
        if (editedDictionary.name && editedDictionary.id) {
            onSave(editedDictionary);
        }
    };

    const handlePatternsChange = (value: string) => {
        const patterns = value
            .split(',')
            .map((p) => p.trim())
            .filter((p) => p.length > 0);
        setEditedDictionary({ ...editedDictionary, appPatterns: patterns });
    };

    const handleAddTerm = () => {
        if (newTerm.written && newTerm.spoken.some((s) => s.trim())) {
            const cleanedTerm: DictionaryTerm = {
                spoken: newTerm.spoken.filter((s) => s.trim()).map((s) => s.trim()),
                written: newTerm.written.trim(),
                context: newTerm.context?.trim() || undefined,
            };
            setEditedDictionary({
                ...editedDictionary,
                terms: [...editedDictionary.terms, cleanedTerm],
            });
            setNewTerm({ spoken: [''], written: '', context: undefined });
        }
    };

    const handleRemoveTerm = (index: number) => {
        setEditedDictionary({
            ...editedDictionary,
            terms: editedDictionary.terms.filter((_, i) => i !== index),
        });
    };

    const handleSpokenChange = (value: string) => {
        const spoken = value.split(',').map((s) => s.trim());
        setNewTerm({ ...newTerm, spoken });
    };

    const handleTestTerm = async () => {
        if (!testInput.trim()) return;

        const result = await onTestTerm(testInput.trim(), editedDictionary.id);
        setTestResult({
            success: result !== null,
            result,
        });
    };

    return (
        <Dialog open onOpenChange={() => onCancel()}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {dictionary.name ? t('Edit Dictionary') : t('Create Dictionary')}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Typography.Title>{t('Name')}</Typography.Title>
                            <Input
                                value={editedDictionary.name}
                                onChange={(e) =>
                                    setEditedDictionary({ ...editedDictionary, name: e.target.value })
                                }
                                placeholder={t('e.g., Development')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Typography.Title>{t('ID')}</Typography.Title>
                            <Input
                                value={editedDictionary.id}
                                onChange={(e) =>
                                    setEditedDictionary({
                                        ...editedDictionary,
                                        id: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                                    })
                                }
                                placeholder="dev-general"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Typography.Title>{t('App Patterns')}</Typography.Title>
                        <Input
                            value={editedDictionary.appPatterns.join(', ')}
                            onChange={(e) => handlePatternsChange(e.target.value)}
                            placeholder={t('e.g., Visual Studio Code, IntelliJ IDEA')}
                        />
                        <Typography.Paragraph>
                            {t('Comma-separated list of app names that will use this dictionary')}
                        </Typography.Paragraph>
                    </div>

                    <div className="flex items-center gap-2">
                        <Switch
                            checked={editedDictionary.enabled}
                            onCheckedChange={(checked) =>
                                setEditedDictionary({ ...editedDictionary, enabled: checked })
                            }
                        />
                        <Typography.Title>{t('Enabled')}</Typography.Title>
                    </div>

                    <div className="space-y-2">
                        <Typography.Title>{t('Dictionary Terms')}</Typography.Title>

                        <div className="border border-zinc-800 rounded-lg p-3 space-y-3 max-h-[250px] overflow-y-auto">
                            {editedDictionary.terms.map((term, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-2 p-2 bg-zinc-900/50 rounded"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-zinc-300">
                                            <span className="text-zinc-500">
                                                {t('Spoken')}:{' '}
                                            </span>
                                            {term.spoken.join(', ')}
                                        </div>
                                        <div className="text-sm font-medium text-zinc-200">
                                            <span className="text-zinc-500">
                                                {t('Written')}:{' '}
                                            </span>
                                            {term.written}
                                        </div>
                                        {term.context && (
                                            <div className="text-xs text-zinc-500">
                                                {term.context}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleRemoveTerm(index)}
                                        className="p-1 text-zinc-400 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}

                            {editedDictionary.terms.length === 0 && (
                                <div className="text-sm text-zinc-500 text-center py-4">
                                    {t('No terms yet. Add your first term below.')}
                                </div>
                            )}
                        </div>

                        <div className="border border-zinc-800 rounded-lg p-3 space-y-2 bg-zinc-900/30">
                            <Typography.Paragraph className="text-xs">
                                {t('Add new term')}
                            </Typography.Paragraph>
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    value={newTerm.spoken.join(', ')}
                                    onChange={(e) => handleSpokenChange(e.target.value)}
                                    placeholder={t('Spoken variants (comma-separated)')}
                                    className="text-sm"
                                />
                                <Input
                                    value={newTerm.written}
                                    onChange={(e) =>
                                        setNewTerm({ ...newTerm, written: e.target.value })
                                    }
                                    placeholder={t('Written form')}
                                    className="text-sm"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Input
                                    value={newTerm.context || ''}
                                    onChange={(e) =>
                                        setNewTerm({
                                            ...newTerm,
                                            context: e.target.value || undefined,
                                        })
                                    }
                                    placeholder={t('Context (optional)')}
                                    className="text-sm flex-1"
                                />
                                <Page.SecondaryButton
                                    size="sm"
                                    onClick={handleAddTerm}
                                    disabled={!newTerm.written || !newTerm.spoken.some((s) => s.trim())}
                                >
                                    <Plus className="h-4 w-4" />
                                </Page.SecondaryButton>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Typography.Title>{t('Test Term')}</Typography.Title>
                        <div className="flex items-center gap-2">
                            <Input
                                value={testInput}
                                onChange={(e) => {
                                    setTestInput(e.target.value);
                                    setTestResult(null);
                                }}
                                placeholder={t('Enter spoken text to test...')}
                                className="flex-1"
                            />
                            <Page.SecondaryButton
                                size="sm"
                                onClick={handleTestTerm}
                                disabled={!testInput.trim()}
                            >
                                {t('Test')}
                            </Page.SecondaryButton>
                        </div>
                        {testResult && (
                            <div
                                className={`flex items-center gap-2 text-sm ${
                                    testResult.success ? 'text-green-500' : 'text-zinc-500'
                                }`}
                            >
                                {testResult.success ? (
                                    <>
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span>
                                            {t('Match found')}: <strong>{testResult.result}</strong>
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="h-4 w-4" />
                                        <span>{t('No match found')}</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Page.SecondaryButton variant="ghost" onClick={onCancel}>
                        {t('Cancel')}
                    </Page.SecondaryButton>
                    <Page.SecondaryButton
                        onClick={handleSave}
                        disabled={!editedDictionary.name || !editedDictionary.id}
                    >
                        {t('Save')}
                    </Page.SecondaryButton>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
