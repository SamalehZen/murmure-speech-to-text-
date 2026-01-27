import { NextResponse } from "next/server"
import { prisma } from "@murmure/database"
import {
    type GlobalConfig,
    type ShortcutConfig,
    type LLMSettings,
    type DictionaryEntry,
    type FormattingRule,
    type AppPrompt,
    DEFAULT_SHORTCUTS,
    DEFAULT_LLM_SETTINGS,
    DEFAULT_FORMATTING_RULES,
    DEFAULT_APP_PROMPTS,
} from "@murmure/shared"
import { createHash } from "crypto"

function generateConfigHash(config: Record<string, unknown>): string {
    const content = JSON.stringify(config)
    return createHash("md5").update(content).digest("hex")
}

export async function GET(request: Request) {
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
        return NextResponse.json(
            { error: "Invalid or expired token" },
            { status: 401 }
        )
    }

    if (session.user.status !== "ACTIVE") {
        return NextResponse.json(
            { error: "User account is not active" },
            { status: 403 }
        )
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

    const shortcuts = (config.shortcuts as unknown as ShortcutConfig[]) || DEFAULT_SHORTCUTS
    const llmSettings = (config.llmSettings as unknown as LLMSettings) || DEFAULT_LLM_SETTINGS
    const dictionary = (config.dictionary as unknown as DictionaryEntry[]) || []
    const formattingRules = (config.formattingRules as unknown as FormattingRule[]) || DEFAULT_FORMATTING_RULES
    const appPrompts = (config.appPrompts as unknown as AppPrompt[]) || DEFAULT_APP_PROMPTS

    const globalConfig: GlobalConfig = {
        shortcuts,
        llmSettings,
        dictionary,
        formattingRules,
        appPrompts,
        updatedAt: config.updatedAt,
    }

    const configHash = generateConfigHash(globalConfig as unknown as Record<string, unknown>)

    const ifNoneMatch = request.headers.get("If-None-Match")
    if (ifNoneMatch === configHash) {
        return new NextResponse(null, { status: 304 })
    }

    return NextResponse.json(globalConfig, {
        headers: {
            ETag: configHash,
            "Cache-Control": "private, max-age=300",
        },
    })
}
