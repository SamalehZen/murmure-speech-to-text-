import { NextResponse } from "next/server"
import { prisma } from "@murmure/database"
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const provider = searchParams.get("provider")

    const where: Record<string, unknown> = {}

    if (startDate || endDate) {
        where.createdAt = {}
        if (startDate)
            (where.createdAt as Record<string, unknown>).gte = new Date(
                startDate
            )
        if (endDate)
            (where.createdAt as Record<string, unknown>).lte = new Date(endDate)
    }

    if (provider) where.provider = provider

    const [usageLogs, aggregates] = await Promise.all([
        prisma.usageLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 100,
            include: {
                user: {
                    select: { email: true, name: true },
                },
            },
        }),
        prisma.usageLog.aggregate({
            where,
            _sum: { tokensIn: true, tokensOut: true, cost: true },
            _count: true,
        }),
    ])

    return NextResponse.json({
        logs: usageLogs,
        summary: {
            totalRequests: aggregates._count,
            totalTokensIn: aggregates._sum.tokensIn || 0,
            totalTokensOut: aggregates._sum.tokensOut || 0,
            totalCost: Number(aggregates._sum.cost || 0),
        },
    })
}

export async function POST(request: Request) {
    const session = await auth()

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { provider, model, tokensIn, tokensOut, cost } = body

    if (!provider || !model) {
        return NextResponse.json(
            { error: "Provider and model are required" },
            { status: 400 }
        )
    }

    const usageLog = await prisma.usageLog.create({
        data: {
            userId: session.user.id,
            provider,
            model,
            tokensIn: tokensIn || 0,
            tokensOut: tokensOut || 0,
            cost: cost || 0,
        },
    })

    return NextResponse.json(usageLog, { status: 201 })
}
