import { NextResponse } from "next/server"
import { prisma } from "@murmure/database"
import { auth } from "@/lib/auth"

export async function PATCH(request: Request) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { userIds, status, plan } = body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return NextResponse.json(
            { error: "User IDs are required" },
            { status: 400 }
        )
    }

    if (!status && !plan) {
        return NextResponse.json(
            { error: "Either status or plan must be provided" },
            { status: 400 }
        )
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (plan) updateData.plan = plan

    const result = await prisma.user.updateMany({
        where: {
            id: { in: userIds },
            role: { not: "ADMIN" },
        },
        data: updateData,
    })

    if (status === "BLOCKED" || status === "SUSPENDED") {
        await prisma.session.deleteMany({
            where: { userId: { in: userIds } },
        })
    }

    return NextResponse.json({
        success: true,
        updatedCount: result.count,
    })
}
