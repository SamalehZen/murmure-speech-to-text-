import { NextResponse } from "next/server"
import { prisma } from "@murmure/database"
import { auth } from "@/lib/auth"

const PLAN_LIMITS: Record<string, number> = {
    FREE: 50,
    PRO: 500,
    BUSINESS: -1,
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({
        where: { id },
        include: {
            subscription: true,
            _count: {
                select: { transcriptions: true, usageLogs: true },
            },
        },
    })

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [todayUsage, monthlyUsage, recentTranscriptions] = await Promise.all([
        prisma.dailyUsage.findUnique({
            where: {
                userId_date: { userId: id, date: today },
            },
        }),
        prisma.usageLog.aggregate({
            where: {
                userId: id,
                createdAt: { gte: thirtyDaysAgo },
            },
            _sum: { tokensIn: true, tokensOut: true, cost: true },
            _count: true,
        }),
        prisma.transcription.findMany({
            where: { userId: id },
            orderBy: { createdAt: "desc" },
            take: 10,
        }),
    ])

    const dailyLimit = PLAN_LIMITS[user.plan] || 50
    const todayRequests = todayUsage?.requests || 0

    return NextResponse.json({
        ...user,
        usage: {
            todayRequests,
            dailyLimit,
            usagePercentage:
                dailyLimit > 0 ? (todayRequests / dailyLimit) * 100 : 0,
            monthlyRequests: monthlyUsage._count,
            monthlyTokens:
                (monthlyUsage._sum.tokensIn || 0) +
                (monthlyUsage._sum.tokensOut || 0),
            monthlyCost: Number(monthlyUsage._sum.cost || 0),
        },
        recentTranscriptions: recentTranscriptions.map((t) => ({
            id: t.id,
            text:
                t.originalText.length > 80
                    ? t.originalText.substring(0, 80) + "..."
                    : t.originalText,
            createdAt: t.createdAt,
            duration: t.duration,
            wordCount: t.wordCount,
        })),
    })
}

const VALID_TRANSITIONS: Record<string, string[]> = {
    ACTIVE: ["SUSPENDED", "BLOCKED"],
    SUSPENDED: ["ACTIVE", "BLOCKED"],
    BLOCKED: ["ACTIVE"],
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { status, plan, note } = body

    const user = await prisma.user.findUnique({ where: { id } })

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (status && status !== user.status) {
        const validTransitions = VALID_TRANSITIONS[user.status] || []
        if (!validTransitions.includes(status)) {
            return NextResponse.json(
                {
                    error: `Invalid status transition from ${user.status} to ${status}`,
                },
                { status: 400 }
            )
        }

        if (user.status === "BLOCKED" && status === "ACTIVE" && !note) {
            return NextResponse.json(
                { error: "Admin note required when unblocking a user" },
                { status: 400 }
            )
        }
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (plan) updateData.plan = plan

    const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        include: {
            subscription: true,
            _count: {
                select: { transcriptions: true, usageLogs: true },
            },
        },
    })

    if (status === "BLOCKED" || status === "SUSPENDED") {
        await prisma.session.deleteMany({ where: { userId: id } })
    }

    return NextResponse.json({ user: updatedUser })
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({ where: { id } })

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (user.role === "ADMIN") {
        return NextResponse.json(
            { error: "Cannot delete admin users" },
            { status: 400 }
        )
    }

    await prisma.user.update({
        where: { id },
        data: { status: "BLOCKED" },
    })

    await prisma.session.deleteMany({ where: { userId: id } })

    return NextResponse.json({ success: true })
}
