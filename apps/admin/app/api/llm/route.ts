import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@murmure/database"
import { auth } from "@/lib/auth"
import {
    checkRateLimit,
    incrementUsage,
    getMaxTokensForPlan,
} from "@/lib/rate-limiter"
import { trackUsage, calculateCost } from "@/lib/usage-tracker"
import { routeToProvider } from "@/lib/llm"
import type { LLMRequest, LLMProviderType } from "@/lib/llm/types"

interface GlobalConfigLLMSettings {
    defaultProvider?: LLMProviderType
    systemPrompt?: string
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized", code: "UNAUTHORIZED" },
                { status: 401 }
            )
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { id: true, status: true, plan: true },
        })

        if (!user || user.status !== "ACTIVE") {
            return NextResponse.json(
                {
                    error: "Account suspended or blocked",
                    code: "ACCOUNT_INACTIVE",
                },
                { status: 403 }
            )
        }

        const rateLimitResult = await checkRateLimit(user.id, user.plan)
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                {
                    error: "Rate limit exceeded",
                    code: "RATE_LIMIT_EXCEEDED",
                    limit: rateLimitResult.limit,
                    remaining: 0,
                    resetAt: rateLimitResult.resetAt,
                },
                { status: 429 }
            )
        }

        const body = (await req.json()) as LLMRequest
        const { prompt, provider, model, options } = body

        if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
            return NextResponse.json(
                { error: "Prompt is required", code: "BAD_REQUEST" },
                { status: 400 }
            )
        }

        const globalConfig = await prisma.globalConfig.findUnique({
            where: { id: "global" },
        })

        const llmSettings = globalConfig?.llmSettings as
            | GlobalConfigLLMSettings
            | null

        const selectedProvider: LLMProviderType =
            provider || llmSettings?.defaultProvider || "openai"

        const startTime = Date.now()
        const result = await routeToProvider({
            provider: selectedProvider,
            model,
            prompt,
            systemPrompt: llmSettings?.systemPrompt,
            options: {
                temperature: options?.temperature ?? 0.7,
                maxTokens: getMaxTokensForPlan(user.plan, options?.maxTokens),
            },
        })
        const duration = Date.now() - startTime

        const cost = calculateCost(result.provider, result.usage, result.model)

        await trackUsage({
            userId: user.id,
            provider: result.provider,
            model: result.model,
            tokensIn: result.usage.promptTokens,
            tokensOut: result.usage.completionTokens,
            cost,
        })

        await incrementUsage(user.id)

        return NextResponse.json(
            {
                text: result.text,
                provider: result.provider,
                model: result.model,
                usage: {
                    promptTokens: result.usage.promptTokens,
                    completionTokens: result.usage.completionTokens,
                    totalTokens: result.usage.totalTokens,
                },
            },
            {
                headers: {
                    "X-RateLimit-Limit": rateLimitResult.limit.toString(),
                    "X-RateLimit-Remaining": Math.max(
                        0,
                        rateLimitResult.remaining - 1
                    ).toString(),
                    "X-RateLimit-Reset": rateLimitResult.resetAt.toISOString(),
                    "X-Request-Duration": duration.toString(),
                },
            }
        )
    } catch (error) {
        console.error("LLM Proxy Error:", error)

        if (error instanceof Error) {
            if (
                error.message.includes("API key") ||
                error.message.includes("authentication")
            ) {
                return NextResponse.json(
                    {
                        error: "Provider authentication failed",
                        code: "PROVIDER_ERROR",
                    },
                    { status: 502 }
                )
            }
        }

        return NextResponse.json(
            { error: "Internal server error", code: "INTERNAL_ERROR" },
            { status: 500 }
        )
    }
}

export async function GET(request: Request) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const provider = searchParams.get("provider")

    const where: Record<string, unknown> = {}

    if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) {
            ;(where.createdAt as Record<string, unknown>).gte = new Date(
                startDate
            )
        }
        if (endDate) {
            ;(where.createdAt as Record<string, unknown>).lte = new Date(
                endDate
            )
        }
    }

    if (provider) {
        where.provider = provider
    }

    const [usageLogs, aggregates] = await Promise.all([
        prisma.usageLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 100,
            include: {
                user: {
                    select: { email: true, name: true },
                },
            },
        }),
        prisma.usageLog.aggregate({
            where,
            _sum: { tokensIn: true, tokensOut: true, cost: true },
            _count: true,
        }),
    ])

    return NextResponse.json({
        logs: usageLogs,
        summary: {
            totalRequests: aggregates._count,
            totalTokensIn: aggregates._sum.tokensIn || 0,
            totalTokensOut: aggregates._sum.tokensOut || 0,
            totalCost: Number(aggregates._sum.cost || 0),
        },
    })
}
