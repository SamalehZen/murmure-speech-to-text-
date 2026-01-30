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
import { ToneConfig } from '../llm-connect.types';

interface ToneEditorProps {
    tone: ToneConfig;
    onSave: (tone: ToneConfig) => void;
    onCancel: () => void;
}

export const ToneEditor = ({ tone, onSave, onCancel }: ToneEditorProps) => {
    const { t } = useTranslation();
    const [editedTone, setEditedTone] = useState<ToneConfig>(tone);

    const handleSave = () => {
        if (editedTone.name && editedTone.prompt_modifier) {
            onSave(editedTone);
        }
    };

    const handleAppsChange = (value: string) => {
        const apps = value
            .split(',')
            .map((app) => app.trim())
            .filter((app) => app.length > 0);
        setEditedTone({ ...editedTone, apps });
    };

    return (
        <Dialog open onOpenChange={() => onCancel()}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {tone.name ? t('Edit Tone') : t('Create Tone')}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-[1fr_80px] gap-4">
                        <div className="space-y-2">
                            <Typography.Title>{t('Name')}</Typography.Title>
                            <Input
                                value={editedTone.name}
                                onChange={(e) =>
                                    setEditedTone({ ...editedTone, name: e.target.value })
                                }
                                placeholder={t('e.g., Professional')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Typography.Title>{t('Icon')}</Typography.Title>
                            <Input
                                value={editedTone.icon}
                                onChange={(e) =>
                                    setEditedTone({ ...editedTone, icon: e.target.value })
                                }
                                placeholder="📧"
                                className="text-center text-xl"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Typography.Title>{t('Description')}</Typography.Title>
                        <Input
                            value={editedTone.description}
                            onChange={(e) =>
                                setEditedTone({ ...editedTone, description: e.target.value })
                            }
                            placeholder={t('Brief description of this tone')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Typography.Title>{t('Prompt Modifier')}</Typography.Title>
                        <Textarea
                            value={editedTone.prompt_modifier}
                            onChange={(e) =>
                                setEditedTone({ ...editedTone, prompt_modifier: e.target.value })
                            }
                            placeholder={t('Instructions for this tone...')}
                            className="h-[150px] font-mono text-sm"
                        />
                        <Typography.Paragraph>
                            {t('Instructions to modify the reformulation style')}
                        </Typography.Paragraph>
                    </div>

                    <div className="space-y-2">
                        <Typography.Title>{t('Associated Apps')}</Typography.Title>
                        <Input
                            value={editedTone.apps.join(', ')}
                            onChange={(e) => handleAppsChange(e.target.value)}
                            placeholder={t('e.g., Microsoft Outlook, Gmail, Microsoft Word')}
                        />
                        <Typography.Paragraph>
                            {t('Comma-separated list of app names that will use this tone by default')}
                        </Typography.Paragraph>
                    </div>
                </div>

                <DialogFooter>
                    <Page.SecondaryButton variant="ghost" onClick={onCancel}>
                        {t('Cancel')}
                    </Page.SecondaryButton>
                    <Page.SecondaryButton
                        onClick={handleSave}
                        disabled={!editedTone.name || !editedTone.prompt_modifier}
                    >
                        {t('Save')}
                    </Page.SecondaryButton>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
