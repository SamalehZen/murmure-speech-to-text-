import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export const useInitialSetup = () => {
    const [isCompleted, setIsCompleted] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const check = async () => {
            try {
                const completed = await invoke<boolean>('is_initial_setup_completed');
                setIsCompleted(completed);
            } catch {
                setIsCompleted(false);
            } finally {
                setIsLoading(false);
            }
        };
        check();
    }, []);

    const completeSetup = async () => {
        await invoke('complete_initial_setup');
        setIsCompleted(true);
    };

    return { isCompleted, isLoading, completeSetup };
};
