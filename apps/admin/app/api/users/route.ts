import { NextResponse } from "next/server"
import { prisma } from "@murmure/database"
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")
    const status = searchParams.get("status")
    const plan = searchParams.get("plan")
    const search = searchParams.get("search")

    const where: Record<string, unknown> = {}

    if (status) where.status = status
    if (plan) where.plan = plan
    if (search) {
        where.OR = [
            { email: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
        ]
    }

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                email: true,
                name: true,
                image: true,
                status: true,
                role: true,
                plan: true,
                createdAt: true,
                lastLoginAt: true,
                _count: {
                    select: { transcriptions: true, usageLogs: true },
                },
            },
        }),
        prisma.user.count({ where }),
    ])

    return NextResponse.json({
        items: users,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
    })
}

export async function PATCH(request: Request) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { userId, status, role, plan } = body

    if (!userId) {
        return NextResponse.json(
            { error: "User ID is required" },
            { status: 400 }
        )
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (role) updateData.role = role
    if (plan) updateData.plan = plan

    const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
    })

    return NextResponse.json({ user })
}
