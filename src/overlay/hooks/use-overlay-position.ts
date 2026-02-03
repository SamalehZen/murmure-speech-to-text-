import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useState, useEffect } from 'react';

export const useOverlayPosition = () => {
    const [position, setPosition] = useState<'top' | 'bottom'>('bottom');

    useEffect(() => {
        invoke<string>('get_overlay_position').then((p) => {
            if (p === 'top' || p === 'bottom') setPosition(p);
        });

        const unlisten = listen<string>('overlay-position-changed', (e) => {
            if (e.payload === 'top' || e.payload === 'bottom') {
                setPosition(e.payload);
            }
        });

        return () => {
            unlisten.then((un) => un());
        };
    }, []);

    return position;
};
