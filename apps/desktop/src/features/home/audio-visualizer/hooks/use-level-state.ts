import { listen } from '@tauri-apps/api/event';
import { useState, useEffect } from 'react';

export const useLevelState = () => {
    const [level, setLevel] = useState(0);

    useEffect(() => {
        const unlistenPromise = listen<number>('mic-level', (e) => {
            const value = Math.max(0, Math.min(1, Number(e.payload ?? 0)));
            setLevel(value);
        });
        return () => {
            unlistenPromise.then((un) => un());
        };
    }, []);

    return { level };
};
