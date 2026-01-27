import { NextResponse } from "next/server"
import { prisma } from "@murmure/database"
import bcrypt from "bcryptjs"
import { registerSchema } from "@/lib/validations"

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const validatedData = registerSchema.parse(body)

        const existingUser = await prisma.user.findUnique({
            where: { email: validatedData.email },
        })

        if (existingUser) {
            return NextResponse.json(
                { error: "Email already exists" },
                { status: 400 }
            )
        }

        const hashedPassword = await bcrypt.hash(validatedData.password, 12)

        const user = await prisma.user.create({
            data: {
                email: validatedData.email,
                name: validatedData.name,
                password: hashedPassword,
            },
        })

        return NextResponse.json(
            { message: "User created successfully", userId: user.id },
            { status: 201 }
        )
    } catch (error) {
        console.error("Registration error:", error)
        return NextResponse.json(
            { error: "Failed to register user" },
            { status: 500 }
        )
    }
}
