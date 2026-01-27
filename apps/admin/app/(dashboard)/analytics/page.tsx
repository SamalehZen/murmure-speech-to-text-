import { prisma } from "@murmure/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

async function getAnalytics() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [usageByProvider, recentUsage, topUsers] = await Promise.all([
        prisma.usageLog.groupBy({
            by: ["provider"],
            _sum: { tokensIn: true, tokensOut: true, cost: true },
            _count: true,
        }),
        prisma.usageLog.findMany({
            where: { createdAt: { gte: thirtyDaysAgo } },
            orderBy: { createdAt: "desc" },
            take: 100,
        }),
        prisma.user.findMany({
            orderBy: {
                usageLogs: { _count: "desc" },
            },
            take: 10,
            include: {
                _count: { select: { usageLogs: true, transcriptions: true } },
            },
        }),
    ])

    return { usageByProvider, recentUsage, topUsers }
}

export default async function AnalyticsPage() {
    const { usageByProvider, topUsers } = await getAnalytics()

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Analytics</h1>
                <p className="text-muted-foreground">
                    Usage statistics and insights
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {usageByProvider.map((provider) => (
                    <Card key={provider.provider}>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                {provider.provider}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Requests
                                </span>
                                <span className="font-medium">
                                    {provider._count.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Tokens In
                                </span>
                                <span className="font-medium">
                                    {(
                                        provider._sum.tokensIn || 0
                                    ).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Tokens Out
                                </span>
                                <span className="font-medium">
                                    {(
                                        provider._sum.tokensOut || 0
                                    ).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                                <span className="text-muted-foreground">
                                    Total Cost
                                </span>
                                <span className="font-medium">
                                    $
                                    {Number(provider._sum.cost || 0).toFixed(4)}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Top Users by Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {topUsers.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">
                                No user activity yet
                            </p>
                        ) : (
                            topUsers.map((user, index) => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between rounded-lg border p-4"
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                                            #{index + 1}
                                        </span>
                                        <div>
                                            <p className="font-medium">
                                                {user.name || "Unnamed User"}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {user.email}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right text-sm">
                                        <p>
                                            {user._count.usageLogs} LLM
                                            requests
                                        </p>
                                        <p className="text-muted-foreground">
                                            {user._count.transcriptions}{" "}
                                            transcriptions
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
