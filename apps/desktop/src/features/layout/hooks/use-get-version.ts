import { getVersion } from '@tauri-apps/api/app';
import { useState, useEffect } from 'react';

export const useGetVersion = () => {
    const [version, setVersion] = useState<string>('');

    useEffect(() => {
        getVersion().then(setVersion);
    }, []);

    return version;
};
