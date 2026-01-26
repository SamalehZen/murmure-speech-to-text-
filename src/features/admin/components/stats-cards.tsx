import { Monitor, Users, Building2, ShieldX, Activity } from 'lucide-react';
import type { LicenseStats } from '../admin.types';

interface StatsCardsProps {
    stats: LicenseStats | null;
    loading: boolean;
}

export function StatsCards({ stats, loading }: StatsCardsProps) {
    const cards = [
        {
            title: 'Total Devices',
            value: stats?.total_devices ?? 0,
            icon: Monitor,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
        },
        {
            title: 'Active Devices',
            value: stats?.active_devices ?? 0,
            icon: Activity,
            color: 'text-green-500',
            bg: 'bg-green-500/10',
        },
        {
            title: 'Blocked Devices',
            value: stats?.blocked_devices ?? 0,
            icon: ShieldX,
            color: 'text-red-500',
            bg: 'bg-red-500/10',
        },
        {
            title: 'Companies',
            value: stats?.total_companies ?? 0,
            icon: Building2,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10',
        },
        {
            title: 'Users',
            value: stats?.total_users ?? 0,
            icon: Users,
            color: 'text-orange-500',
            bg: 'bg-orange-500/10',
        },
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {cards.map((_, i) => (
                    <div key={i} className="bg-zinc-800/50 rounded-lg p-4 animate-pulse">
                        <div className="h-4 bg-zinc-700 rounded w-20 mb-2" />
                        <div className="h-8 bg-zinc-700 rounded w-16" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {cards.map((card) => (
                <div key={card.title} className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1.5 rounded ${card.bg}`}>
                            <card.icon className={`w-4 h-4 ${card.color}`} />
                        </div>
                        <span className="text-sm text-zinc-400">{card.title}</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{card.value.toLocaleString()}</p>
                </div>
            ))}
        </div>
    );
}
