import { NextResponse } from "next/server"
import { prisma } from "@murmure/database"
import { auth } from "@/lib/auth"

export async function GET() {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let config = await prisma.globalConfig.findUnique({
        where: { id: "global" },
    })

    if (!config) {
        config = await prisma.globalConfig.create({
            data: { id: "global" },
        })
    }

    return NextResponse.json(config)
}

export async function PATCH(request: Request) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
        shortcuts,
        llmSettings,
        dictionary,
        formattingRules,
        appPrompts,
    } = body

    const updateData: Record<string, unknown> = {}
    if (shortcuts !== undefined) updateData.shortcuts = shortcuts
    if (llmSettings !== undefined) updateData.llmSettings = llmSettings
    if (dictionary !== undefined) updateData.dictionary = dictionary
    if (formattingRules !== undefined)
        updateData.formattingRules = formattingRules
    if (appPrompts !== undefined) updateData.appPrompts = appPrompts

    const config = await prisma.globalConfig.upsert({
        where: { id: "global" },
        update: updateData,
        create: { id: "global", ...updateData },
    })

    return NextResponse.json(config)
}
