import { useState } from 'react';
import { Plus, X, Globe } from 'lucide-react';
import { Input } from '@/components/input';
import type { TriggerRule } from '../power-mode.types';
import { createUrlTrigger } from '../power-mode.types';
import { useTranslation } from '@/i18n';

interface UrlInputProps {
    urls: TriggerRule[];
    onChange: (urls: TriggerRule[]) => void;
}

export const UrlInput = ({ urls, onChange }: UrlInputProps) => {
    const { t } = useTranslation();
    const [inputValue, setInputValue] = useState('');

    const handleAdd = () => {
        const pattern = inputValue.trim();
        if (pattern.length === 0) return;

        const cleanPattern = pattern
            .replace(/^https?:\/\//, '')
            .replace(/\/.*$/, '');

        if (
            cleanPattern.length > 0 &&
            !urls.some(
                (u) => u.pattern.toLowerCase() === cleanPattern.toLowerCase()
            )
        ) {
            onChange([...urls, createUrlTrigger(cleanPattern)]);
        }
        setInputValue('');
    };

    const handleRemove = (id: string) => {
        onChange(urls.filter((u) => u.id !== id));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <Input
                    placeholder={t('Enter domain (e.g., github.com)')}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-zinc-800 border-zinc-700"
                />
                <button
                    type="button"
                    onClick={handleAdd}
                    disabled={inputValue.trim().length === 0}
                    className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-200 rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {urls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {urls.map((url) => (
                        <div
                            key={url.id}
                            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-full"
                        >
                            <Globe className="w-3 h-3 text-zinc-500" />
                            <span className="text-sm text-zinc-300">
                                {url.pattern}
                            </span>
                            <button
                                type="button"
                                onClick={() => handleRemove(url.id)}
                                className="text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
