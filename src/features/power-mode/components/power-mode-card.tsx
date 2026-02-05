import { Trash2, Edit2, GripVertical } from 'lucide-react';
import { Switch } from '@/components/switch';
import type { PowerModeConfig } from '../power-mode.types';

interface PowerModeCardProps {
    powerMode: PowerModeConfig;
    onEdit: () => void;
    onDelete: () => void;
    onToggle: (enabled: boolean) => void;
}

export const PowerModeCard = ({
    powerMode,
    onEdit,
    onDelete,
    onToggle,
}: PowerModeCardProps) => {
    const triggerCount = powerMode.triggers.length;

    return (
        <div className="flex items-center gap-3 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors group">
            <div className="text-zinc-500 cursor-grab">
                <GripVertical className="w-4 h-4" />
            </div>

            <div className="text-2xl">{powerMode.emoji}</div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h3 className="font-medium text-zinc-200 truncate">
                        {powerMode.name || 'Unnamed Power Mode'}
                    </h3>
                    {powerMode.is_ai_enhancement_enabled && (
                        <span className="px-1.5 py-0.5 text-xs bg-sky-500/20 text-sky-400 rounded">
                            AI
                        </span>
                    )}
                </div>
                <p className="text-sm text-zinc-500">
                    {triggerCount} trigger{triggerCount !== 1 ? 's' : ''} •
                    Priority {powerMode.priority}
                </p>
            </div>

            <div className="flex items-center gap-2">
                <Switch
                    checked={powerMode.is_enabled}
                    onCheckedChange={onToggle}
                />
                <button
                    onClick={onEdit}
                    className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded-md transition-colors"
                >
                    <Edit2 className="w-4 h-4" />
                </button>
                <button
                    onClick={onDelete}
                    className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded-md transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
