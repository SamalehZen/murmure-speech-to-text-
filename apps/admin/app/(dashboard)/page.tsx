import { prisma } from "@murmure/database"
import { Users, DollarSign, Activity, Zap, TrendingUp } from "lucide-react"
import { StatsCard } from "@/components/stats-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DashboardCharts } from "./dashboard-charts"

const PLAN_PRICES = {
    FREE: 0,
    PRO: 9.99,
    BUSINESS: 29.99,
}

async function getStats() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)

    const [
        totalUsers,
        activeUsers,
        newUsersThisMonth,
        newUsersLastMonth,
        totalTranscriptions,
        todayRequests,
        tokenUsage,
        usersByPlan,
        recentUsers,
        dailyRequestsData,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({
            where: { lastLoginAt: { gte: sevenDaysAgo } },
        }),
        prisma.user.count({
            where: { createdAt: { gte: thirtyDaysAgo } },
        }),
        prisma.user.count({
            where: {
                createdAt: {
                    gte: sixtyDaysAgo,
                    lt: thirtyDaysAgo,
                },
            },
        }),
        prisma.transcription.count(),
        prisma.dailyUsage.aggregate({
            where: { date: today },
            _sum: { requests: true },
        }),
        prisma.usageLog.aggregate({
            _sum: { tokensIn: true, tokensOut: true, cost: true },
        }),
        prisma.user.groupBy({
            by: ["plan"],
            _count: true,
        }),
        prisma.user.findMany({
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true,
                email: true,
                name: true,
                image: true,
                plan: true,
                status: true,
                createdAt: true,
            },
        }),
        prisma.$queryRaw`
            SELECT 
                DATE(date) as date,
                SUM(requests) as requests
            FROM "DailyUsage"
            WHERE date >= ${sevenDaysAgo}
            GROUP BY DATE(date)
            ORDER BY DATE(date) ASC
        ` as Promise<Array<{ date: Date; requests: bigint }>>,
    ])

    const totalTokens =
        (tokenUsage._sum.tokensIn || 0) + (tokenUsage._sum.tokensOut || 0)

    const proUsers = usersByPlan.find((p) => p.plan === "PRO")?._count || 0
    const businessUsers =
        usersByPlan.find((p) => p.plan === "BUSINESS")?._count || 0
    const mrr = proUsers * PLAN_PRICES.PRO + businessUsers * PLAN_PRICES.BUSINESS

    const userGrowth =
        newUsersLastMonth > 0
            ? Math.round(
                  ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) *
                      100
              )
            : newUsersThisMonth > 0
              ? 100
              : 0

    const dates: string[] = []
    for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        dates.push(date.toISOString().split("T")[0])
    }

    const requestsMap = new Map(
        dailyRequestsData.map((r) => [
            new Date(r.date).toISOString().split("T")[0],
            Number(r.requests),
        ])
    )

    const chartData = dates.map((date) => ({
        date: new Date(date).toLocaleDateString("en-US", {
            weekday: "short",
        }),
        requests: requestsMap.get(date) || 0,
    }))

    const revenueByPlan = [
        {
            name: "Free",
            value: usersByPlan.find((p) => p.plan === "FREE")?._count || 0,
            color: "#9ca3af",
        },
        { name: "Pro", value: proUsers, color: "#3b82f6" },
        { name: "Business", value: businessUsers, color: "#8b5cf6" },
    ]

    return {
        totalUsers,
        activeUsers,
        userGrowth,
        totalTranscriptions,
        todayRequests: todayRequests._sum.requests || 0,
        totalTokens,
        mrr,
        recentUsers,
        chartData,
        revenueByPlan,
    }
}

const statusColors: Record<string, string> = {
    ACTIVE: "bg-green-500/10 text-green-500",
    SUSPENDED: "bg-yellow-500/10 text-yellow-500",
    BLOCKED: "bg-red-500/10 text-red-500",
}

const planColors: Record<string, string> = {
    FREE: "bg-gray-500/10 text-gray-500",
    PRO: "bg-blue-500/10 text-blue-500",
    BUSINESS: "bg-purple-500/10 text-purple-500",
}

export default async function DashboardPage() {
    const stats = await getStats()

    const getInitials = (name: string | null) => {
        if (!name) return "U"
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
    }

    const formatNumber = (num: number): string => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + "M"
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + "K"
        }
        return num.toString()
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome to the Murmure Admin Dashboard
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Users"
                    value={stats.totalUsers}
                    icon={Users}
                    change={stats.userGrowth}
                    trend={stats.userGrowth >= 0 ? "up" : "down"}
                    description="vs last month"
                />
                <StatsCard
                    title="Monthly Revenue"
                    value={`€${stats.mrr.toFixed(2)}`}
                    icon={DollarSign}
                    description="MRR"
                />
                <StatsCard
                    title="Today's Requests"
                    value={formatNumber(stats.todayRequests)}
                    icon={Activity}
                    description="API requests"
                />
                <StatsCard
                    title="Tokens Used"
                    value={formatNumber(stats.totalTokens)}
                    icon={Zap}
                    description="Total LLM tokens"
                />
            </div>

            <DashboardCharts
                requestsData={stats.chartData}
                revenueByPlan={stats.revenueByPlan}
            />

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Recent Users</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.recentUsers.length === 0 ? (
                                <p className="text-center text-muted-foreground py-4">
                                    No users yet
                                </p>
                            ) : (
                                stats.recentUsers.map((user) => (
                                    <div
                                        key={user.id}
                                        className="flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage
                                                    src={user.image || undefined}
                                                />
                                                <AvatarFallback>
                                                    {getInitials(user.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="text-sm font-medium">
                                                    {user.name || "Unnamed"}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                className={planColors[user.plan]}
                                                variant="secondary"
                                            >
                                                {user.plan}
                                            </Badge>
                                            <Badge
                                                className={
                                                    statusColors[user.status]
                                                }
                                                variant="secondary"
                                            >
                                                {user.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Quick Stats</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                    Active Users (7d)
                                </span>
                                <span className="font-medium">
                                    {stats.activeUsers}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                    Total Transcriptions
                                </span>
                                <span className="font-medium">
                                    {stats.totalTranscriptions.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                    Free Users
                                </span>
                                <span className="font-medium">
                                    {stats.revenueByPlan[0].value}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                    Pro Users
                                </span>
                                <span className="font-medium">
                                    {stats.revenueByPlan[1].value}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                    Business Users
                                </span>
                                <span className="font-medium">
                                    {stats.revenueByPlan[2].value}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
