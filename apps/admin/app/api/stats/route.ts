import { NextResponse } from "next/server"
import { prisma } from "@murmure/database"
import { auth } from "@/lib/auth"

export async function GET() {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [
        totalUsers,
        activeUsers,
        newUsersThisMonth,
        newUsersLastMonth,
        totalTranscriptions,
        todayRequests,
        tokenUsage,
        revenue,
        subscriptionStats,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({
            where: {
                lastLoginAt: { gte: sevenDaysAgo },
            },
        }),
        prisma.user.count({
            where: {
                createdAt: { gte: thirtyDaysAgo },
            },
        }),
        prisma.user.count({
            where: {
                createdAt: {
                    gte: new Date(
                        new Date().setMonth(new Date().getMonth() - 2)
                    ),
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
        prisma.usageLog.aggregate({
            where: { createdAt: { gte: thirtyDaysAgo } },
            _sum: { cost: true },
        }),
        prisma.subscription.groupBy({
            by: ["status"],
            _count: true,
        }),
    ])

    const totalTokens =
        (tokenUsage._sum.tokensIn || 0) + (tokenUsage._sum.tokensOut || 0)

    const activeSubscriptions =
        subscriptionStats.find((s) => s.status === "ACTIVE")?._count || 0

    const proPlanPrice = 9.99
    const businessPlanPrice = 29.99

    const [proUsers, businessUsers] = await Promise.all([
        prisma.user.count({ where: { plan: "PRO" } }),
        prisma.user.count({ where: { plan: "BUSINESS" } }),
    ])

    const estimatedMRR = proUsers * proPlanPrice + businessUsers * businessPlanPrice

    const userGrowth =
        newUsersLastMonth > 0
            ? Math.round(
                  ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) *
                      100
              )
            : 100

    return NextResponse.json({
        totalUsers,
        activeUsers,
        newUsersThisMonth,
        userGrowth,
        totalTranscriptions,
        todayRequests: todayRequests._sum.requests || 0,
        totalTokens,
        totalCost: Number(tokenUsage._sum.cost || 0),
        monthlyRevenue: Number(revenue._sum.cost || 0),
        mrr: estimatedMRR,
        activeSubscriptions,
    })
}
