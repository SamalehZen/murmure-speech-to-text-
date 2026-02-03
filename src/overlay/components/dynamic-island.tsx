import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Mic } from 'lucide-react';
import { WaveformBars } from './waveform-bars';
import { useOverlayPosition } from '../hooks/use-overlay-position';
import { useLevelState } from '@/features/home/audio-visualizer/hooks/use-level-state';

enum UIState {
    IDLE = 'idle',
    LISTENING = 'listening',
    THINKING = 'thinking',
}

interface LLMMode {
    name: string;
    prompt: string;
    model: string;
    shortcut: string;
}

interface LLMConnectSettings {
    url: string;
    model: string;
    prompt: string;
    modes: LLMMode[];
    active_mode_index: number;
    onboarding_completed: boolean;
    active_provider: string;
    providers: Record<string, unknown>;
    app_detection_enabled: boolean;
    app_rules: unknown[];
}

const springTransition = {
    type: 'spring' as const,
    stiffness: 400,
    damping: 30,
    mass: 0.5,
    restDelta: 0.001,
};

const ThinkingIndicator = () => (
    <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 10 }}
        className="flex items-center gap-2"
    >
        <motion.div
            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
            transition={{
                rotate: { repeat: Infinity, duration: 3, ease: 'linear' },
                scale: { repeat: Infinity, duration: 2 },
            }}
        >
            <Sparkles className="w-4 h-4 text-[#007AFF]" fill="currentColor" />
        </motion.div>
        <span className="text-[14px] font-medium text-[#007AFF]">Thinking</span>
    </motion.div>
);

const IdleDot = () => (
    <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5 }}
        className="w-2 h-2 rounded-full bg-white/40"
    />
);

export const DynamicIsland = () => {
    const position = useOverlayPosition();
    const { level } = useLevelState();
    const [uiState, setUiState] = useState<UIState>(UIState.IDLE);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [activeMode, setActiveMode] = useState<string>('');
    const silenceTimeoutRef = useRef<number | null>(null);
    const feedbackTimeoutRef = useRef<number | null>(null);
    const llmProcessingRef = useRef(false);
    const wasListeningRef = useRef(false);

    const clearSilenceTimeout = useCallback(() => {
        if (silenceTimeoutRef.current !== null) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
        }
    }, []);

    useEffect(() => {
        invoke<LLMConnectSettings>('get_llm_connect_settings')
            .then((settings) => {
                const mode = settings.modes[settings.active_mode_index];
                if (mode?.name) {
                    setActiveMode(mode.name);
                }
            })
            .catch(() => {
                setActiveMode('Dictation');
            });
    }, []);

    useEffect(() => {
        if (feedback !== null) return;

        if (llmProcessingRef.current) {
            setUiState(UIState.THINKING);
            clearSilenceTimeout();
            return;
        }

        if (level > 0.01) {
            clearSilenceTimeout();
            setUiState(UIState.LISTENING);
            wasListeningRef.current = true;
        } else if (uiState === UIState.LISTENING && wasListeningRef.current) {
            if (silenceTimeoutRef.current === null) {
                silenceTimeoutRef.current = window.setTimeout(() => {
                    silenceTimeoutRef.current = null;
                    if (llmProcessingRef.current) {
                        setUiState(UIState.THINKING);
                    } else {
                        setUiState(UIState.IDLE);
                        wasListeningRef.current = false;
                    }
                }, 300);
            }
        }
    }, [level, uiState, feedback, clearSilenceTimeout]);

    useEffect(() => {
        const unlistenStart = listen('llm-processing-start', () => {
            llmProcessingRef.current = true;
            setUiState(UIState.THINKING);
        });

        const unlistenEnd = listen('llm-processing-end', () => {
            llmProcessingRef.current = false;
            wasListeningRef.current = false;
            setTimeout(() => {
                if (!llmProcessingRef.current) {
                    setUiState(UIState.IDLE);
                }
            }, 150);
        });

        return () => {
            unlistenStart.then((un) => un());
            unlistenEnd.then((un) => un());
        };
    }, []);

    useEffect(() => {
        const unlistenFeedback = listen<string>('overlay-feedback', (event) => {
            setFeedback(event.payload);
        });

        const unlistenSettings = listen<LLMConnectSettings>(
            'llm-settings-updated',
            (event) => {
                const mode =
                    event.payload.modes[event.payload.active_mode_index];
                if (mode?.name) {
                    setActiveMode(mode.name);
                    setFeedback(mode.name);
                }
            }
        );

        return () => {
            unlistenFeedback.then((un) => un());
            unlistenSettings.then((un) => un());
        };
    }, []);

    useEffect(() => {
        if (feedback !== null) {
            if (feedbackTimeoutRef.current !== null) {
                clearTimeout(feedbackTimeoutRef.current);
            }
            feedbackTimeoutRef.current = window.setTimeout(() => {
                setFeedback(null);
                feedbackTimeoutRef.current = null;
            }, 1500);
        }
        return () => {
            if (feedbackTimeoutRef.current !== null) {
                clearTimeout(feedbackTimeoutRef.current);
            }
        };
    }, [feedback]);

    useEffect(() => {
        return () => {
            clearSilenceTimeout();
        };
    }, [clearSilenceTimeout]);

    const width = uiState === UIState.IDLE && feedback === null ? 200 : 360;
    const height = 46;

    const isTop = position === 'top';

    const borderRadius = isTop
        ? {
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
              borderBottomLeftRadius: 20,
              borderBottomRightRadius: 20,
          }
        : {
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderBottomLeftRadius: 20,
              borderBottomRightRadius: 20,
          };

    const positionClasses = isTop
        ? 'fixed top-0 left-1/2 -translate-x-1/2'
        : 'fixed bottom-4 left-1/2 -translate-x-1/2';

    const shadowStyle = isTop
        ? '0 10px 30px rgba(0,0,0,0.8), inset 0 -1px 0 rgba(255,255,255,0.15)'
        : '0 8px 32px rgba(0,0,0,0.4), 0 10px 30px rgba(0,0,0,0.8), inset 0 -1px 0 rgba(255,255,255,0.15)';

    return (
        <motion.div
            animate={{ width, height, ...borderRadius }}
            transition={springTransition}
            className={`${positionClasses} bg-gradient-to-b from-black to-[#141414] backdrop-blur-[40px] saturate-150 border border-white/5 ring-1 ring-white/5 flex items-center justify-between px-5 select-none overflow-hidden`}
            style={{ boxShadow: shadowStyle }}
        >
            <div className="flex items-center gap-3 min-w-0">
                <Mic className="w-4 h-4 text-white/80 shrink-0" />
                <AnimatePresence mode="wait">
                    {feedback !== null ? (
                        <motion.span
                            key="feedback"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.15 }}
                            className="text-[14px] font-semibold text-white truncate"
                        >
                            {feedback}
                        </motion.span>
                    ) : (
                        <motion.span
                            key="mode"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-[14px] font-semibold text-white truncate"
                        >
                            {activeMode}
                        </motion.span>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence mode="wait">
                {uiState === UIState.LISTENING && feedback === null && (
                    <motion.div
                        key="waveform"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                    >
                        <WaveformBars level={level} />
                    </motion.div>
                )}
                {uiState === UIState.THINKING && feedback === null && (
                    <ThinkingIndicator key="thinking" />
                )}
                {uiState === UIState.IDLE && feedback === null && (
                    <IdleDot key="idle" />
                )}
            </AnimatePresence>
        </motion.div>
    );
};
