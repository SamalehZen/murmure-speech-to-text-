import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/button';

interface BasePromptEditorProps {
    basePrompt: string;
    defaultBasePrompt: string;
    onSave: (prompt: string) => void;
}

export function BasePromptEditor({
    basePrompt,
    defaultBasePrompt,
    onSave,
}: BasePromptEditorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [localPrompt, setLocalPrompt] = useState(basePrompt);

    useEffect(() => {
        setLocalPrompt(basePrompt);
    }, [basePrompt]);

    const hasChanges = localPrompt !== basePrompt;
    const isDefault = basePrompt === defaultBasePrompt;

    const handleSave = () => {
        onSave(localPrompt);
    };

    const handleCancel = () => {
        setLocalPrompt(basePrompt);
    };

    const handleReset = () => {
        setLocalPrompt(defaultBasePrompt);
        onSave(defaultBasePrompt);
    };

    return (
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/30">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-zinc-800/50 transition-colors rounded-lg"
            >
                <div className="flex items-center gap-2">
                    {isOpen ? (
                        <ChevronDown className="size-4 text-zinc-500" />
                    ) : (
                        <ChevronRight className="size-4 text-zinc-500" />
                    )}
                    <span className="font-medium text-zinc-200">Base Prompt</span>
                    <span className="text-xs text-zinc-500">
                        (shared by all tones with inheritance enabled)
                    </span>
                </div>
                {!isDefault && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleReset();
                        }}
                    >
                        <RotateCcw className="size-4 mr-1" />
                        Reset to default
                    </Button>
                )}
            </button>

            {isOpen && (
                <div className="px-4 pb-4 space-y-3">
                    <textarea
                        value={localPrompt}
                        onChange={(e) => setLocalPrompt(e.target.value)}
                        className="w-full min-h-[300px] p-3 rounded-md border border-zinc-700 bg-zinc-800 text-zinc-200 font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-sky-500"
                        placeholder="Base prompt template..."
                    />

                    <div className="flex items-center justify-between">
                        <p className="text-xs text-zinc-500">
                            Use <code className="bg-zinc-700 px-1 py-0.5 rounded text-zinc-300">{'{{TONE_INSTRUCTIONS}}'}</code> where tone-specific content should appear
                        </p>
                        {hasChanges && (
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </Button>
                                <Button size="sm" onClick={handleSave}>
                                    Save
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
