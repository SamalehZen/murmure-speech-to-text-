import { Plus } from 'lucide-react';
import { PowerModeCard } from './power-mode-card';
import type { PowerModeConfig } from '../power-mode.types';
import { useTranslation } from '@/i18n';

interface PowerModeListProps {
    powerModes: PowerModeConfig[];
    onEdit: (powerMode: PowerModeConfig) => void;
    onDelete: (id: string) => void;
    onToggle: (id: string, enabled: boolean) => void;
    onAdd: () => void;
}

export const PowerModeList = ({
    powerModes,
    onEdit,
    onDelete,
    onToggle,
    onAdd,
}: PowerModeListProps) => {
    const { t } = useTranslation();

    if (powerModes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-lg font-medium text-zinc-200 mb-2">
                    {t('No Power Modes configured')}
                </h3>
                <p className="text-sm text-zinc-400 mb-6 max-w-sm">
                    {t(
                        'Create Power Modes to automatically apply different AI settings based on the application you\'re using.'
                    )}
                </p>
                <button
                    onClick={onAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    {t('Create Power Mode')}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {powerModes
                .sort((a, b) => b.priority - a.priority)
                .map((powerMode) => (
                    <PowerModeCard
                        key={powerMode.id}
                        powerMode={powerMode}
                        onEdit={() => onEdit(powerMode)}
                        onDelete={() => onDelete(powerMode.id)}
                        onToggle={(enabled) => onToggle(powerMode.id, enabled)}
                    />
                ))}

            <button
                onClick={onAdd}
                className="flex items-center justify-center gap-2 w-full p-3 border border-dashed border-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
            >
                <Plus className="w-4 h-4" />
                {t('Add Power Mode')}
            </button>
        </div>
    );
};
