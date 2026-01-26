import { Typography } from '@/components/typography';
import { Page } from '@/components/page';
import { StatsCards } from './components/stats-cards';
import { DevicesTable } from './components/devices-table';
import { useAdminStats, useDevices } from './hooks/use-admin-data';
import { Shield } from 'lucide-react';

export function AdminDashboard() {
    const { stats, loading: statsLoading, refresh: refreshStats } = useAdminStats();
    const { devices, loading: devicesLoading, refresh: refreshDevices, blockDevice, unblockDevice } = useDevices();

    const handleRefresh = () => {
        refreshStats();
        refreshDevices();
    };

    return (
        <main>
            <div className="space-y-6">
                <Page.Header>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                            <Shield className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <Typography.MainTitle data-testid="admin-title">
                                License Admin
                            </Typography.MainTitle>
                            <Typography.Paragraph className="text-zinc-400">
                                Manage devices, users, and companies
                            </Typography.Paragraph>
                        </div>
                    </div>
                </Page.Header>

                <div className="px-6 space-y-6">
                    <StatsCards stats={stats} loading={statsLoading} />
                    
                    <DevicesTable
                        devices={devices}
                        loading={devicesLoading}
                        onBlock={blockDevice}
                        onUnblock={unblockDevice}
                        onRefresh={handleRefresh}
                    />
                </div>
            </div>
        </main>
    );
}
