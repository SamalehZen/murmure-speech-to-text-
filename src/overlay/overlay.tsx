import { listen } from '@tauri-apps/api/event';
import React, { useEffect, useState } from 'react';
import { AudioVisualizer } from '@/features/home/audio-visualizer/audio-visualizer';
import { AppIcon } from './app-icons';

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
        });

        return () => {
            unlistenFeedback.then((unlisten) => unlisten());
            unlistenSettings.then((unlisten) => unlisten());
            unlistenDetectedApp.then((unlisten) => unlisten());
            unlistenHide.then((unlisten) => unlisten());
        };
    }, []);

    useEffect(() => {
        if (feedback) {
            const timer = setTimeout(() => setFeedback(null), 2000);
            return () => clearTimeout(timer);
        }
    }, [feedback]);

    const showIcon = detectedApp && detectedApp.icon_key !== 'default';

    return (
        <div className="h-[18px] bg-black/90 rounded-full flex items-center justify-center select-none overflow-hidden px-2 gap-1.5 backdrop-blur-sm border border-white/10">
            {showIcon && (
                <div className="flex-shrink-0 animate-in fade-in slide-in-from-left-2 duration-300">
                    <AppIcon appKey={detectedApp.icon_key} size={12} />
                </div>
            )}
            {feedback ? (
                <span className="text-[9px] text-white font-medium truncate animate-in fade-in zoom-in duration-200">
                    {feedback}
                </span>
            ) : (
                <div className="origin-center">
                    <AudioVisualizer
                        className="bg-transparent"
                        bars={12}
                        rows={9}
                        audioPixelWidth={2}
                        audioPixelHeight={2}
                    />
                </div>
            )}
        </div>
    );
};
