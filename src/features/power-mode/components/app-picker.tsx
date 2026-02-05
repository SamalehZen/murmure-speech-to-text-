import { useState, useMemo } from 'react';
import { Search, X, Check, AppWindow } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/dialog';
import { Input } from '@/components/input';
import { useInstalledApps } from '../hooks/use-installed-apps';
import type { TriggerRule, InstalledApp } from '../power-mode.types';
import { createAppTrigger } from '../power-mode.types';
import { useTranslation } from '@/i18n';

interface AppPickerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedApps: TriggerRule[];
    onSelect: (apps: TriggerRule[]) => void;
}

export const AppPicker = ({
    open,
    onOpenChange,
    selectedApps,
    onSelect,
}: AppPickerProps) => {
    const { t } = useTranslation();
    const { apps, isLoading } = useInstalledApps();
    const [searchQuery, setSearchQuery] = useState('');
    const [selected, setSelected] = useState<Set<string>>(
        new Set(selectedApps.map((a) => a.pattern.toLowerCase()))
    );

    const filteredApps = useMemo(() => {
        if (searchQuery.length === 0) return apps;
        const query = searchQuery.toLowerCase();
        return apps.filter(
            (app) =>
                app.name.toLowerCase().includes(query) ||
                app.executable_name.toLowerCase().includes(query)
        );
    }, [apps, searchQuery]);

    const toggleApp = (app: InstalledApp) => {
        const key = app.executable_name.toLowerCase();
        const newSelected = new Set(selected);
        if (newSelected.has(key)) {
            newSelected.delete(key);
        } else {
            newSelected.add(key);
        }
        setSelected(newSelected);
    };

    const handleConfirm = () => {
        const triggers: TriggerRule[] = apps
            .filter((app) => selected.has(app.executable_name.toLowerCase()))
            .map((app) => createAppTrigger(app.executable_name, app.name));
        onSelect(triggers);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{t('Select Applications')}</DialogTitle>
                </DialogHeader>

                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                        placeholder={t('Search applications...')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-zinc-800 border-zinc-700"
                    />
                    {searchQuery.length > 0 && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 min-h-[300px] max-h-[400px]">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8 text-zinc-500">
                            {t('Loading applications...')}
                        </div>
                    ) : filteredApps.length === 0 ? (
                        <div className="flex items-center justify-center py-8 text-zinc-500">
                            {t('No applications found')}
                        </div>
                    ) : (
                        filteredApps.map((app) => {
                            const isSelected = selected.has(
                                app.executable_name.toLowerCase()
                            );
                            return (
                                <button
                                    key={app.executable_name}
                                    onClick={() => toggleApp(app)}
                                    className={`flex items-center gap-3 w-full p-2 rounded-md transition-colors ${
                                        isSelected
                                            ? 'bg-sky-500/20 border border-sky-500/50'
                                            : 'hover:bg-zinc-800 border border-transparent'
                                    }`}
                                >
                                    <div
                                        className={`flex items-center justify-center w-8 h-8 rounded-md ${
                                            isSelected
                                                ? 'bg-sky-500 text-white'
                                                : 'bg-zinc-700 text-zinc-400'
                                        }`}
                                    >
                                        {isSelected ? (
                                            <Check className="w-4 h-4" />
                                        ) : (
                                            <AppWindow className="w-4 h-4" />
                                        )}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="text-sm font-medium text-zinc-200">
                                            {app.name}
                                        </div>
                                        <div className="text-xs text-zinc-500">
                                            {app.executable_name}
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                <DialogFooter className="mt-4">
                    <button
                        onClick={() => onOpenChange(false)}
                        className="px-4 py-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                        {t('Cancel')}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors"
                    >
                        {t('Confirm')} ({selected.size})
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
