import { prisma } from "@murmure/database"
import {
    CreditCard,
    DollarSign,
    TrendingDown,
    TrendingUp,
    Users,
} from "lucide-react"
import { StatsCard } from "@/components/stats-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BillingCharts } from "./billing-charts"

const PLAN_PRICES = {
    FREE: 0,
    PRO: 9.99,
    BUSINESS: 29.99,
}

async function getBillingStats() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)

    const [
        subscriptions,
        planCounts,
        activeSubscriptions,
        newSubsThisMonth,
        newSubsLastMonth,
        canceledThisMonth,
        usageCosts,
    ] = await Promise.all([
        prisma.subscription.findMany({
            include: { user: true },
            orderBy: { createdAt: "desc" },
            take: 20,
        }),
        prisma.user.groupBy({
            by: ["plan"],
            _count: true,
        }),
        prisma.subscription.count({
            where: { status: "ACTIVE" },
        }),
        prisma.subscription.count({
            where: { createdAt: { gte: thirtyDaysAgo } },
        }),
        prisma.subscription.count({
            where: {
                createdAt: {
                    gte: sixtyDaysAgo,
                    lt: thirtyDaysAgo,
                },
            },
        }),
        prisma.subscription.count({
            where: {
                status: "CANCELED",
                updatedAt: { gte: thirtyDaysAgo },
            },
        }),
        prisma.usageLog.aggregate({
            where: { createdAt: { gte: thirtyDaysAgo } },
            _sum: { cost: true },
        }),
    ])

    const proUsers = planCounts.find((p) => p.plan === "PRO")?._count || 0
    const businessUsers =
        planCounts.find((p) => p.plan === "BUSINESS")?._count || 0
    const freeUsers = planCounts.find((p) => p.plan === "FREE")?._count || 0

    const mrr = proUsers * PLAN_PRICES.PRO + businessUsers * PLAN_PRICES.BUSINESS

    const totalPaidUsers = proUsers + businessUsers
    const churnRate =
        totalPaidUsers > 0
            ? ((canceledThisMonth / totalPaidUsers) * 100).toFixed(1)
            : "0"

    const growthRate =
        newSubsLastMonth > 0
            ? (
                  ((newSubsThisMonth - newSubsLastMonth) / newSubsLastMonth) *
                  100
              ).toFixed(1)
            : newSubsThisMonth > 0
              ? "100"
              : "0"

    const revenueByPlan = [
        { name: "Pro", value: proUsers * PLAN_PRICES.PRO, users: proUsers },
        {
            name: "Business",
            value: businessUsers * PLAN_PRICES.BUSINESS,
            users: businessUsers,
        },
    ]

    return {
        subscriptions,
        planCounts: { free: freeUsers, pro: proUsers, business: businessUsers },
        mrr,
        activeSubscriptions,
        churnRate,
        growthRate: Number(growthRate),
        apiCosts: Number(usageCosts._sum.cost || 0),
        revenueByPlan,
    }
}

const subscriptionStatusColors: Record<string, string> = {
    ACTIVE: "bg-green-500/10 text-green-500",
    CANCELED: "bg-gray-500/10 text-gray-500",
    PAST_DUE: "bg-yellow-500/10 text-yellow-500",
    UNPAID: "bg-red-500/10 text-red-500",
    TRIALING: "bg-blue-500/10 text-blue-500",
}

export default async function BillingPage() {
    const stats = await getBillingStats()

    const netRevenue = stats.mrr - stats.apiCosts

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Billing & Subscriptions</h1>
                <p className="text-muted-foreground">
                    Revenue overview and subscription management
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Monthly Recurring Revenue"
                    value={`€${stats.mrr.toFixed(2)}`}
                    icon={DollarSign}
                    description="MRR"
                />
                <StatsCard
                    title="Active Subscriptions"
                    value={stats.activeSubscriptions}
                    icon={Users}
                    change={stats.growthRate}
                    trend={stats.growthRate >= 0 ? "up" : "down"}
                    description="vs last month"
                />
                <StatsCard
                    title="Churn Rate"
                    value={`${stats.churnRate}%`}
                    icon={TrendingDown}
                    description="monthly"
                />
                <StatsCard
                    title="Net Revenue"
                    value={`€${netRevenue.toFixed(2)}`}
                    icon={TrendingUp}
                    description="after API costs"
                />
            </div>

            <BillingCharts revenueByPlan={stats.revenueByPlan} />

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Free Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">
                            {stats.planCounts.free}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            50 requests/day limit
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            €0.00 revenue
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Pro Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">
                            {stats.planCounts.pro}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            500 requests/day limit
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            €{(stats.planCounts.pro * PLAN_PRICES.PRO).toFixed(2)}{" "}
                            revenue
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Business Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">
                            {stats.planCounts.business}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Unlimited requests
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            €
                            {(
                                stats.planCounts.business * PLAN_PRICES.BUSINESS
                            ).toFixed(2)}{" "}
                            revenue
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>API Costs Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-lg border p-4">
                            <p className="text-sm text-muted-foreground">
                                Monthly API Costs
                            </p>
                            <p className="text-2xl font-bold text-red-500">
                                €{stats.apiCosts.toFixed(2)}
                            </p>
                        </div>
                        <div className="rounded-lg border p-4">
                            <p className="text-sm text-muted-foreground">
                                Monthly Revenue
                            </p>
                            <p className="text-2xl font-bold text-green-500">
                                €{stats.mrr.toFixed(2)}
                            </p>
                        </div>
                        <div className="rounded-lg border p-4">
                            <p className="text-sm text-muted-foreground">
                                Profit Margin
                            </p>
                            <p className="text-2xl font-bold">
                                {stats.mrr > 0
                                    ? `${(((stats.mrr - stats.apiCosts) / stats.mrr) * 100).toFixed(1)}%`
                                    : "N/A"}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Subscriptions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {stats.subscriptions.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">
                                No subscriptions yet
                            </p>
                        ) : (
                            stats.subscriptions.map((sub) => (
                                <div
                                    key={sub.id}
                                    className="flex items-center justify-between rounded-lg border p-4"
                                >
                                    <div className="flex items-center gap-4">
                                        <CreditCard className="h-8 w-8 text-muted-foreground" />
                                        <div>
                                            <p className="font-medium">
                                                {sub.user.name || sub.user.email}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {sub.stripeSubscriptionId
                                                    ? `Stripe: ${sub.stripeSubscriptionId.slice(0, 20)}...`
                                                    : "Manual subscription"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right text-sm">
                                            {sub.stripeCurrentPeriodEnd && (
                                                <p>
                                                    Renews{" "}
                                                    {new Date(
                                                        sub.stripeCurrentPeriodEnd
                                                    ).toLocaleDateString()}
                                                </p>
                                            )}
                                            <p className="text-muted-foreground">
                                                €
                                                {sub.user.plan === "PRO"
                                                    ? PLAN_PRICES.PRO.toFixed(2)
                                                    : sub.user.plan === "BUSINESS"
                                                      ? PLAN_PRICES.BUSINESS.toFixed(
                                                            2
                                                        )
                                                      : "0.00"}
                                                /mo
                                            </p>
                                        </div>
                                        <Badge
                                            className={
                                                subscriptionStatusColors[
                                                    sub.status
                                                ]
                                            }
                                            variant="secondary"
                                        >
                                            {sub.status}
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
                    <CardTitle>Stripe Integration</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Configure Stripe for automated billing and subscription
                        management.
                    </p>
                    <ul className="mt-4 space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                            <code className="rounded bg-muted px-2 py-1">
                                STRIPE_SECRET_KEY
                            </code>
                            <span className="text-muted-foreground">
                                - Required for API access
                            </span>
                        </li>
                        <li className="flex items-center gap-2">
                            <code className="rounded bg-muted px-2 py-1">
                                STRIPE_WEBHOOK_SECRET
                            </code>
                            <span className="text-muted-foreground">
                                - Required for webhook validation
                            </span>
                        </li>
                        <li className="flex items-center gap-2">
                            <code className="rounded bg-muted px-2 py-1">
                                STRIPE_PRO_PRICE_ID
                            </code>
                            <span className="text-muted-foreground">
                                - Pro plan price ID
                            </span>
                        </li>
                        <li className="flex items-center gap-2">
                            <code className="rounded bg-muted px-2 py-1">
                                STRIPE_BUSINESS_PRICE_ID
                            </code>
                            <span className="text-muted-foreground">
                                - Business plan price ID
                            </span>
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    )
}
