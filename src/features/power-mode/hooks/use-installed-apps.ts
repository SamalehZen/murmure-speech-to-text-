import { useState, useEffect, useCallback } from 'react';
import { powerModeApi } from '../api/power-mode.api';
import type { InstalledApp } from '../power-mode.types';

export const useInstalledApps = () => {
    const [apps, setApps] = useState<InstalledApp[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadApps = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await powerModeApi.getInstalledApps();
            setApps(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load installed apps');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadApps();
    }, [loadApps]);

    return {
        apps,
        isLoading,
        error,
        refresh: loadApps,
    };
};
