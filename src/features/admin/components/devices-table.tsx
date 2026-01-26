import { useState } from 'react';
import { Shield, ShieldOff, RefreshCw, Search, Monitor } from 'lucide-react';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import type { Device } from '../admin.types';

interface DevicesTableProps {
    devices: Device[];
    loading: boolean;
    onBlock: (deviceId: string, reason?: string) => Promise<void>;
    onUnblock: (deviceId: string) => Promise<void>;
    onRefresh: () => void;
}

export function DevicesTable({ devices, loading, onBlock, onUnblock, onRefresh }: DevicesTableProps) {
    const [search, setSearch] = useState('');
    const [blockingId, setBlockingId] = useState<string | null>(null);

    const filtered = devices.filter(d => 
        d.device_id.toLowerCase().includes(search.toLowerCase()) ||
        d.platform.toLowerCase().includes(search.toLowerCase()) ||
        d.app_version.toLowerCase().includes(search.toLowerCase())
    );

    const handleBlock = async (device: Device) => {
        const reason = window.prompt('Raison du blocage (optionnel):');
        setBlockingId(device.device_id);
        try {
            await onBlock(device.device_id, reason || undefined);
        } finally {
            setBlockingId(null);
        }
    };

    const handleUnblock = async (device: Device) => {
        setBlockingId(device.device_id);
        try {
            await onUnblock(device.device_id);
        } finally {
            setBlockingId(null);
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getPlatformIcon = (platform: string) => {
        const colors: Record<string, string> = {
            windows: 'text-blue-400',
            linux: 'text-orange-400',
            macos: 'text-zinc-300',
            unknown: 'text-zinc-500'
        };
        return <Monitor className={`w-4 h-4 ${colors[platform] || colors.unknown}`} />;
    };

    return (
        <div className="bg-zinc-800/50 rounded-lg border border-zinc-700/50">
            <div className="p-4 border-b border-zinc-700/50 flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">Devices ({devices.length})</h3>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input
                            placeholder="Rechercher..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 w-64 bg-zinc-900/50"
                        />
                    </div>
                    <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-zinc-700/50">
                            <th className="text-left p-3 text-xs font-medium text-zinc-400 uppercase">Device ID</th>
                            <th className="text-left p-3 text-xs font-medium text-zinc-400 uppercase">Platform</th>
                            <th className="text-left p-3 text-xs font-medium text-zinc-400 uppercase">Version</th>
                            <th className="text-left p-3 text-xs font-medium text-zinc-400 uppercase">Last Heartbeat</th>
                            <th className="text-left p-3 text-xs font-medium text-zinc-400 uppercase">Status</th>
                            <th className="text-right p-3 text-xs font-medium text-zinc-400 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((device) => (
                            <tr key={device.id} className="border-b border-zinc-700/30 hover:bg-zinc-700/20">
                                <td className="p-3">
                                    <code className="text-sm text-zinc-300 font-mono">{device.device_id.slice(0, 8)}...</code>
                                </td>
                                <td className="p-3">
                                    <div className="flex items-center gap-2">
                                        {getPlatformIcon(device.platform)}
                                        <span className="text-sm text-zinc-300 capitalize">{device.platform}</span>
                                    </div>
                                </td>
                                <td className="p-3 text-sm text-zinc-400">{device.app_version}</td>
                                <td className="p-3 text-sm text-zinc-400">{formatDate(device.last_heartbeat)}</td>
                                <td className="p-3">
                                    {device.is_blocked ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                                            Blocked
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                                            Active
                                        </span>
                                    )}
                                </td>
                                <td className="p-3 text-right">
                                    {device.is_blocked ? (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleUnblock(device)}
                                            disabled={blockingId === device.device_id}
                                            className="text-green-400 hover:text-green-300"
                                        >
                                            <ShieldOff className="w-4 h-4 mr-1" />
                                            Unblock
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleBlock(device)}
                                            disabled={blockingId === device.device_id}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            <Shield className="w-4 h-4 mr-1" />
                                            Block
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-zinc-500">
                                    {loading ? 'Chargement...' : 'Aucun device trouvé'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
