import { NextResponse } from "next/server"
import { prisma } from "@murmure/database"
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "7d"

    let daysBack = 7
    if (period === "30d") daysBack = 30
    else if (period === "90d") daysBack = 90

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)
    startDate.setHours(0, 0, 0, 0)

    const [dailyRequests, usageByProvider, usersByPlan, recentTranscriptions] =
        await Promise.all([
            prisma.$queryRaw`
                SELECT 
                    DATE(date) as date,
                    SUM(requests) as requests
                FROM "DailyUsage"
                WHERE date >= ${startDate}
                GROUP BY DATE(date)
                ORDER BY DATE(date) ASC
            ` as Promise<Array<{ date: Date; requests: bigint }>>,
            prisma.usageLog.groupBy({
                by: ["provider"],
                where: { createdAt: { gte: startDate } },
                _sum: { tokensIn: true, tokensOut: true, cost: true },
                _count: true,
            }),
            prisma.user.groupBy({
                by: ["plan"],
                _count: true,
            }),
            prisma.transcription.findMany({
                where: { createdAt: { gte: startDate } },
                orderBy: { createdAt: "desc" },
                take: 10,
                include: {
                    user: { select: { email: true, name: true } },
                },
            }),
        ])

    const dates: string[] = []
    for (let i = daysBack - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        dates.push(date.toISOString().split("T")[0])
    }

    const requestsMap = new Map(
        dailyRequests.map((r) => [
            new Date(r.date).toISOString().split("T")[0],
            Number(r.requests),
        ])
    )

    const dailyRequestsData = dates.map((date) => ({
        date,
        requests: requestsMap.get(date) || 0,
    }))

    const totalRequests = dailyRequestsData.reduce(
        (sum, d) => sum + d.requests,
        0
    )

    const providerData = usageByProvider.map((p) => ({
        name: p.provider,
        value: p._count,
        tokens: (p._sum.tokensIn || 0) + (p._sum.tokensOut || 0),
        cost: Number(p._sum.cost || 0),
    }))

    const planData = usersByPlan.map((p) => {
        const colors: Record<string, string> = {
            FREE: "#9ca3af",
            PRO: "#3b82f6",
            BUSINESS: "#8b5cf6",
        }
        return {
            name: p.plan,
            value: p._count,
            color: colors[p.plan] || "#888888",
        }
    })

    const totalTokens = providerData.reduce((sum, p) => sum + p.tokens, 0)
    const totalCost = providerData.reduce((sum, p) => sum + p.cost, 0)

    return NextResponse.json({
        period,
        dailyRequests: dailyRequestsData,
        totalRequests,
        usageByProvider: providerData,
        usersByPlan: planData,
        totalTokens,
        totalCost,
        recentTranscriptions: recentTranscriptions.map((t) => ({
            id: t.id,
            text:
                t.originalText.length > 100
                    ? t.originalText.substring(0, 100) + "..."
                    : t.originalText,
            language: t.language,
            duration: t.duration,
            wordCount: t.wordCount,
            createdAt: t.createdAt,
            user: t.user,
        })),
    })
}
