import { listen } from '@tauri-apps/api/event';
import { useState, useEffect, useRef } from 'react';

export const useLevelState = () => {
    const [level, setLevel] = useState(0);
    const smoothedRef = useRef(0);

    useEffect(() => {
        const unlistenPromise = listen<number>('mic-level', (e) => {
            const raw = Math.max(0, Math.min(1, Number(e.payload ?? 0)));

            const alpha = raw > smoothedRef.current ? 0.3 : 0.1;
            smoothedRef.current =
                smoothedRef.current + alpha * (raw - smoothedRef.current);

            const boosted = Math.pow(smoothedRef.current, 0.7);
            setLevel(boosted);
        });

        return () => {
            unlistenPromise.then((un) => un());
        };
    }, []);

    return { level };
};
