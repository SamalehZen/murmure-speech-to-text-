import { useState } from 'react';
import { Zap, AlertCircle } from 'lucide-react';
import { SettingsUI } from '@/components/settings-ui';
import { Switch } from '@/components/switch';
import { Typography } from '@/components/typography';
import { PowerModeList } from './components/power-mode-list';
import { PowerModeForm } from './components/power-mode-form';
import { usePowerModes } from './hooks/use-power-modes';
import type { PowerModeConfig } from './power-mode.types';
import { useTranslation } from '@/i18n';

export const PowerMode = () => {
    const { t } = useTranslation();
    const {
        powerModes,
        isEnabled,
        isLoading,
        error,
        savePowerMode,
        deletePowerMode,
        toggleEnabled,
    } = usePowerModes();

    const [editingPowerMode, setEditingPowerMode] =
        useState<PowerModeConfig | null>(null);
    const [showForm, setShowForm] = useState(false);

    const handleAdd = () => {
        setEditingPowerMode(null);
        setShowForm(true);
    };

    const handleEdit = (powerMode: PowerModeConfig) => {
        setEditingPowerMode(powerMode);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        try {
            await deletePowerMode(id);
        } catch {
            console.error('Failed to delete power mode');
        }
    };

    const handleToggle = async (id: string, enabled: boolean) => {
        const powerMode = powerModes.find((pm) => pm.id === id);
        if (powerMode) {
            try {
                await savePowerMode({ ...powerMode, is_enabled: enabled });
            } catch {
                console.error('Failed to toggle power mode');
            }
        }
    };

    const handleSave = async (config: PowerModeConfig) => {
        await savePowerMode(config);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-zinc-500">{t('Loading...')}</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full p-6 overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 bg-amber-500/20 text-amber-400 rounded-lg">
                    <Zap className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold text-zinc-100">
                        {t('Power Mode')}
                    </h1>
                    <p className="text-sm text-zinc-400">
                        {t(
                            'Automatically apply AI settings based on active application'
                        )}
                    </p>
                </div>
            </div>

            {error !== null && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            <SettingsUI.Container className="mb-6">
                <SettingsUI.Item>
                    <SettingsUI.Description>
                        <Typography.Title>{t('Enable Power Mode')}</Typography.Title>
                        <Typography.Paragraph>
                            {t(
                                'When enabled, Power Mode will automatically switch AI settings based on detected applications and websites.'
                            )}
                        </Typography.Paragraph>
                    </SettingsUI.Description>
                    <Switch
                        checked={isEnabled}
                        onCheckedChange={toggleEnabled}
                    />
                </SettingsUI.Item>
            </SettingsUI.Container>

            <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-medium text-zinc-300">
                        {t('Configured Power Modes')}
                    </h2>
                    <span className="text-xs text-zinc-500">
                        {powerModes.length} {t('configured')}
                    </span>
                </div>

                <PowerModeList
                    powerModes={powerModes}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggle={handleToggle}
                    onAdd={handleAdd}
                />
            </div>

            <PowerModeForm
                open={showForm}
                onOpenChange={setShowForm}
                powerMode={editingPowerMode}
                onSave={handleSave}
            />
        </div>
    );
};
