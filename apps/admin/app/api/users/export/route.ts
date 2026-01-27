import { NextResponse } from "next/server"
import { prisma } from "@murmure/database"
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const plan = searchParams.get("plan")
    const ids = searchParams.get("ids")

    const where: Record<string, unknown> = {}

    if (status) where.status = status
    if (plan) where.plan = plan
    if (ids) {
        where.id = { in: ids.split(",") }
    }

    const users = await prisma.user.findMany({
        where,
        select: {
            id: true,
            email: true,
            name: true,
            status: true,
            role: true,
            plan: true,
            language: true,
            createdAt: true,
            lastLoginAt: true,
            _count: {
                select: { transcriptions: true, usageLogs: true },
            },
        },
        orderBy: { createdAt: "desc" },
    })

    const csvHeader = [
        "ID",
        "Email",
        "Name",
        "Status",
        "Role",
        "Plan",
        "Language",
        "Created At",
        "Last Login",
        "Transcriptions",
        "LLM Requests",
    ].join(",")

    const csvRows = users.map((user) =>
        [
            user.id,
            `"${user.email}"`,
            `"${user.name || ""}"`,
            user.status,
            user.role,
            user.plan,
            user.language,
            user.createdAt.toISOString(),
            user.lastLoginAt?.toISOString() || "",
            user._count.transcriptions,
            user._count.usageLogs,
        ].join(",")
    )

    const csv = [csvHeader, ...csvRows].join("\n")

    return new NextResponse(csv, {
        headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="users-export-${new Date().toISOString().split("T")[0]}.csv"`,
        },
    })
}
