import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Device, Company, User, LicenseStats, AuditLogEntry } from '../admin.types';

export function useAdminStats() {
    const [stats, setStats] = useState<LicenseStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await invoke<LicenseStats>('admin_get_stats');
            setStats(data);
        } catch (err) {
            setError(err as string);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { stats, loading, error, refresh };
}

export function useDevices() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await invoke<Device[]>('admin_list_devices');
            setDevices(data);
        } catch (err) {
            setError(err as string);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const blockDevice = async (deviceId: string, reason?: string) => {
        await invoke('admin_block_device', { deviceId, reason });
        await refresh();
    };

    const unblockDevice = async (deviceId: string) => {
        await invoke('admin_unblock_device', { deviceId });
        await refresh();
    };

    return { devices, loading, error, refresh, blockDevice, unblockDevice };
}

export function useCompanies() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await invoke<Company[]>('admin_list_companies');
            setCompanies(data);
        } catch (err) {
            setError(err as string);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const blockCompany = async (companyId: string, reason?: string) => {
        await invoke('admin_block_company', { companyId, reason });
        await refresh();
    };

    const unblockCompany = async (companyId: string) => {
        await invoke('admin_unblock_company', { companyId });
        await refresh();
    };

    return { companies, loading, error, refresh, blockCompany, unblockCompany };
}

export function useUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await invoke<User[]>('admin_list_users');
            setUsers(data);
        } catch (err) {
            setError(err as string);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const blockUser = async (userId: string, reason?: string) => {
        await invoke('admin_block_user', { userId, reason });
        await refresh();
    };

    const unblockUser = async (userId: string) => {
        await invoke('admin_unblock_user', { userId });
        await refresh();
    };

    return { users, loading, error, refresh, blockUser, unblockUser };
}

export function useAuditLog(deviceId?: string) {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await invoke<AuditLogEntry[]>('admin_get_audit_log', { 
                deviceId: deviceId || null,
                limit: 100 
            });
            setLogs(data);
        } catch (err) {
            setError(err as string);
        } finally {
            setLoading(false);
        }
    }, [deviceId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { logs, loading, error, refresh };
}
