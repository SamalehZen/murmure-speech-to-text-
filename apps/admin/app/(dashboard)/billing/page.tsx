import { prisma } from "@murmure/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

async function getBillingStats() {
    const [subscriptions, planCounts] = await Promise.all([
        prisma.subscription.findMany({
            include: { user: true },
            orderBy: { createdAt: "desc" },
        }),
        prisma.user.groupBy({
            by: ["plan"],
            _count: true,
        }),
    ])

    return { subscriptions, planCounts }
}

const statusColors: Record<string, string> = {
    ACTIVE: "bg-green-500/10 text-green-500",
    CANCELED: "bg-gray-500/10 text-gray-500",
    PAST_DUE: "bg-yellow-500/10 text-yellow-500",
    UNPAID: "bg-red-500/10 text-red-500",
    TRIALING: "bg-blue-500/10 text-blue-500",
}

export default async function BillingPage() {
    const { subscriptions, planCounts } = await getBillingStats()

    const getPlanCount = (plan: string) => {
        const found = planCounts.find((p) => p.plan === plan)
        return found?._count || 0
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Billing</h1>
                <p className="text-muted-foreground">
                    Subscription and revenue management
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Free Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">
                            {getPlanCount("FREE")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            50 requests/day limit
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Pro Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">
                            {getPlanCount("PRO")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            500 requests/day limit
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Business Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">
                            {getPlanCount("BUSINESS")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Unlimited requests
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Subscriptions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {subscriptions.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">
                                No subscriptions yet
                            </p>
                        ) : (
                            subscriptions.map((sub) => (
                                <div
                                    key={sub.id}
                                    className="flex items-center justify-between rounded-lg border p-4"
                                >
                                    <div>
                                        <p className="font-medium">
                                            {sub.user.name || sub.user.email}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {sub.stripeSubscriptionId ||
                                                "No Stripe ID"}
                                        </p>
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
                                                Created{" "}
                                                {new Date(
                                                    sub.createdAt
                                                ).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <Badge
                                            className={statusColors[sub.status]}
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
                        Stripe webhook and payment processing configuration will
                        be available here. Ensure you have set up the following
                        environment variables:
                    </p>
                    <ul className="mt-4 space-y-2 text-sm">
                        <li>
                            <code className="rounded bg-muted px-2 py-1">
                                STRIPE_SECRET_KEY
                            </code>
                        </li>
                        <li>
                            <code className="rounded bg-muted px-2 py-1">
                                STRIPE_WEBHOOK_SECRET
                            </code>
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    )
}
