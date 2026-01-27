import { prisma } from "@murmure/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Mic, Activity, DollarSign } from "lucide-react"

async function getStats() {
    const [totalUsers, activeUsers, totalTranscriptions, totalUsageLogs] =
        await Promise.all([
            prisma.user.count(),
            prisma.user.count({
                where: {
                    lastLoginAt: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    },
                },
            }),
            prisma.transcription.count(),
            prisma.usageLog.aggregate({
                _sum: { tokensIn: true, tokensOut: true },
            }),
        ])

    return {
        totalUsers,
        activeUsers,
        totalTranscriptions,
        totalTokens:
            (totalUsageLogs._sum.tokensIn || 0) +
            (totalUsageLogs._sum.tokensOut || 0),
    }
}

export default async function DashboardPage() {
    const stats = await getStats()

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome to the Murmure Admin Dashboard
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Users
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.totalUsers.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Registered accounts
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Active Users
                        </CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.activeUsers.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Last 7 days
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Transcriptions
                        </CardTitle>
                        <Mic className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.totalTranscriptions.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Total processed
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Tokens Used
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.totalTokens.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            LLM tokens consumed
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Activity feed coming soon...
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                            Quick actions panel coming soon...
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
