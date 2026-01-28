import { NextResponse } from "next/server"
import { prisma } from "@murmure/database"

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization")

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { error: "Authorization header required" },
                { status: 401 }
            )
        }

        const token = authHeader.replace("Bearer ", "")

        const session = await prisma.session.findUnique({
            where: { sessionToken: token },
            include: { user: true },
        })

        if (!session || session.expires < new Date()) {
            if (session) {
                await prisma.session.delete({
                    where: { id: session.id },
                })
            }
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            )
        }

        if (session.user.status !== "ACTIVE") {
            return NextResponse.json(
                { error: "Account is not active" },
                { status: 403 }
            )
        }

        return NextResponse.json({
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            role: session.user.role,
            plan: session.user.plan,
        })
    } catch (error) {
        console.error("Auth check error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}

export async function DELETE(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization")

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { error: "Authorization header required" },
                { status: 401 }
            )
        }

        const token = authHeader.replace("Bearer ", "")

        await prisma.session.deleteMany({
            where: { sessionToken: token },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Logout error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
