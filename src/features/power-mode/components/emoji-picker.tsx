import { useState } from 'react';
import { EMOJI_OPTIONS } from '../power-mode.types';

interface EmojiPickerProps {
    value: string;
    onChange: (emoji: string) => void;
}

export const EmojiPicker = ({ value, onChange }: EmojiPickerProps) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center w-12 h-12 text-2xl bg-zinc-800 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors"
            >
                {value}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute left-0 top-full mt-2 z-50 p-2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl">
                        <div className="grid grid-cols-5 gap-1">
                            {EMOJI_OPTIONS.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => {
                                        onChange(emoji);
                                        setIsOpen(false);
                                    }}
                                    className={`flex items-center justify-center w-10 h-10 text-xl rounded-md transition-colors ${
                                        value === emoji
                                            ? 'bg-sky-500/20 border border-sky-500/50'
                                            : 'hover:bg-zinc-700'
                                    }`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
