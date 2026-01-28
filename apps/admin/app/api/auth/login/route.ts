import { NextResponse } from "next/server"
import { prisma } from "@murmure/database"
import bcrypt from "bcryptjs"
import { randomUUID } from "crypto"

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { email, password } = body

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 }
            )
        }

        const user = await prisma.user.findUnique({
            where: { email },
        })

        if (!user || !user.password) {
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
            )
        }

        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) {
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
            )
        }

        if (user.status !== "ACTIVE") {
            return NextResponse.json(
                { error: "Account is not active" },
                { status: 403 }
            )
        }

        const token = randomUUID()
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

        await prisma.session.create({
            data: {
                sessionToken: token,
                userId: user.id,
                expires,
            },
        })

        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        })

        return NextResponse.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                plan: user.plan,
            },
        })
    } catch (error) {
        console.error("Login error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
