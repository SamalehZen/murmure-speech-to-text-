import { NextResponse } from "next/server"
import { prisma } from "@murmure/database"
import { auth } from "@/lib/auth"
import {
    DEFAULT_SHORTCUTS,
    DEFAULT_LLM_SETTINGS,
    DEFAULT_FORMATTING_RULES,
    DEFAULT_APP_PROMPTS,
} from "@murmure/shared"

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
            data: {
                id: "global",
                shortcuts: DEFAULT_SHORTCUTS as unknown as Record<string, unknown>,
                llmSettings: DEFAULT_LLM_SETTINGS as unknown as Record<string, unknown>,
                dictionary: [] as unknown as Record<string, unknown>,
                formattingRules: DEFAULT_FORMATTING_RULES as unknown as Record<string, unknown>,
                appPrompts: DEFAULT_APP_PROMPTS as unknown as Record<string, unknown>,
            },
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

    const currentConfig = await prisma.globalConfig.findUnique({
        where: { id: "global" },
    })

    const updateData: Record<string, unknown> = {}
    const changedFields: string[] = []

    if (shortcuts !== undefined) {
        updateData.shortcuts = shortcuts
        changedFields.push("shortcuts")
    }
    if (llmSettings !== undefined) {
        updateData.llmSettings = llmSettings
        changedFields.push("llm")
    }
    if (dictionary !== undefined) {
        updateData.dictionary = dictionary
        changedFields.push("dictionary")
    }
    if (formattingRules !== undefined) {
        updateData.formattingRules = formattingRules
        changedFields.push("formatting")
    }
    if (appPrompts !== undefined) {
        updateData.appPrompts = appPrompts
        changedFields.push("prompts")
    }

    const config = await prisma.globalConfig.upsert({
        where: { id: "global" },
        update: updateData,
        create: {
            id: "global",
            shortcuts: DEFAULT_SHORTCUTS as unknown as Record<string, unknown>,
            llmSettings: DEFAULT_LLM_SETTINGS as unknown as Record<string, unknown>,
            dictionary: [] as unknown as Record<string, unknown>,
            formattingRules: DEFAULT_FORMATTING_RULES as unknown as Record<string, unknown>,
            appPrompts: DEFAULT_APP_PROMPTS as unknown as Record<string, unknown>,
            ...updateData,
        },
    })

    if (currentConfig && changedFields.length > 0) {
        for (const field of changedFields) {
            const configType = field as "shortcuts" | "llm" | "dictionary" | "prompts" | "formatting"
            const previousValue = currentConfig[
                field === "llm"
                    ? "llmSettings"
                    : field === "prompts"
                    ? "appPrompts"
                    : field === "formatting"
                    ? "formattingRules"
                    : field
            ]

            await prisma.configVersion.create({
                data: {
                    configType,
                    previousValue: previousValue as Record<string, unknown>,
                    newValue: updateData[
                        field === "llm"
                            ? "llmSettings"
                            : field === "prompts"
                            ? "appPrompts"
                            : field === "formatting"
                            ? "formattingRules"
                            : field
                    ] as Record<string, unknown>,
                    changedBy: session.user.id,
                },
            })
        }
    }

    return NextResponse.json(config)
}
