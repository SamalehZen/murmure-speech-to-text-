import { listen } from '@tauri-apps/api/event';
import React, { useEffect, useState } from 'react';
import { AudioVisualizer } from '@/features/home/audio-visualizer/audio-visualizer';
import { AppIcon } from './app-icons';
import { ThinkingIndicator } from './thinking-indicator';

interface LLMConnectSettings {
    modes: { name: string }[];
    active_mode_index: number;
}

interface DetectedAppEvent {
    app_name: string;
    category: string;
    icon_key: string;
}

export const Overlay: React.FC = () => {
    const [feedback, setFeedback] = useState<string | null>(null);
    const [detectedApp, setDetectedApp] = useState<DetectedAppEvent | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const unlistenFeedback = listen<string>('overlay-feedback', (event) => {
            setFeedback(event.payload);
        });

        const unlistenSettings = listen<LLMConnectSettings>(
            'llm-settings-updated',
            (event) => {
                const activeMode =
                    event.payload.modes[event.payload.active_mode_index];
                if (activeMode?.name) {
                    setFeedback(activeMode.name);
                }
            }
        );

        const unlistenDetectedApp = listen<DetectedAppEvent>(
            'detected-app',
            (event) => {
                setDetectedApp(event.payload);
            }
        );

        const unlistenHide = listen('hide-overlay', () => {
            setDetectedApp(null);
            setIsProcessing(false);
        });

        const unlistenProcessingStart = listen('llm-processing-start', () => {
            setIsProcessing(true);
        });

        const unlistenProcessingEnd = listen('llm-processing-end', () => {
            setIsProcessing(false);
        });

        return () => {
            unlistenFeedback.then((unlisten) => unlisten());
            unlistenSettings.then((unlisten) => unlisten());
            unlistenDetectedApp.then((unlisten) => unlisten());
            unlistenHide.then((unlisten) => unlisten());
            unlistenProcessingStart.then((unlisten) => unlisten());
            unlistenProcessingEnd.then((unlisten) => unlisten());
        };
    }, []);

    useEffect(() => {
        if (feedback && !isProcessing) {
            const timer = setTimeout(() => setFeedback(null), 2000);
            return () => clearTimeout(timer);
        }
    }, [feedback, isProcessing]);

    const showIcon = detectedApp && detectedApp.icon_key !== 'default';

    const renderContent = () => {
        if (isProcessing) {
            return (
                <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                    <ThinkingIndicator size={14} />
                </div>
            );
        }

        if (feedback) {
            return (
                <span className="text-[9px] text-white font-medium truncate animate-in fade-in zoom-in duration-200">
                    {feedback}
                </span>
            );
        }

        return (
            <div className="origin-center">
                <AudioVisualizer
                    className="bg-transparent"
                    bars={12}
                    rows={9}
                    audioPixelWidth={2}
                    audioPixelHeight={2}
                />
            </div>
        );
    };

    return (
        <div
            className={`h-[22px] rounded-full flex items-center justify-center select-none overflow-hidden px-2 gap-1.5 backdrop-blur-sm border transition-all duration-300 ${
                isProcessing
                    ? 'bg-gradient-to-r from-violet-950/90 to-fuchsia-950/90 border-violet-500/30'
                    : 'bg-black/90 border-white/10'
            }`}
        >
            {showIcon && (
                <div className="flex-shrink-0 animate-in fade-in slide-in-from-left-2 duration-300">
                    <AppIcon appKey={detectedApp.icon_key} size={12} />
                </div>
            )}
            {renderContent()}
        </div>
    );
};
