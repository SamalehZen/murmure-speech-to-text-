import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@murmure/database"
import { auth } from "@/lib/auth"
import {
    checkRateLimit,
    incrementUsage,
    getMaxTokensForPlan,
} from "@/lib/rate-limiter"
import { trackUsage } from "@/lib/usage-tracker"
import { routeToProviderStream } from "@/lib/llm"
import type { LLMRequest, LLMProviderType } from "@/lib/llm/types"
import { getModelPricing } from "@/lib/llm/pricing"

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

        const maxTokens = getMaxTokensForPlan(user.plan, options?.maxTokens)

        const encoder = new TextEncoder()
        let totalChunks = 0
        let fullText = ""

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const generator = routeToProviderStream({
                        provider: selectedProvider,
                        model,
                        prompt,
                        systemPrompt: llmSettings?.systemPrompt,
                        options: {
                            temperature: options?.temperature ?? 0.7,
                            maxTokens,
                        },
                    })

                    for await (const chunk of generator) {
                        totalChunks++
                        fullText += chunk
                        const data = JSON.stringify({ text: chunk })
                        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
                    }

                    controller.enqueue(encoder.encode("data: [DONE]\n\n"))
                    controller.close()

                    const estimatedPromptTokens = Math.ceil(prompt.length / 4)
                    const estimatedCompletionTokens = Math.ceil(
                        fullText.length / 4
                    )
                    const pricing = getModelPricing(
                        selectedProvider,
                        model || "default"
                    )
                    const cost =
                        (estimatedPromptTokens / 1000) * pricing.input +
                        (estimatedCompletionTokens / 1000) * pricing.output

                    await trackUsage({
                        userId: user.id,
                        provider: selectedProvider,
                        model: model || "default",
                        tokensIn: estimatedPromptTokens,
                        tokensOut: estimatedCompletionTokens,
                        cost,
                    })

                    await incrementUsage(user.id)
                } catch (error) {
                    console.error("Stream error:", error)
                    const errorData = JSON.stringify({
                        error: "Stream error occurred",
                    })
                    controller.enqueue(
                        encoder.encode(`data: ${errorData}\n\n`)
                    )
                    controller.close()
                }
            },
        })

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
                "X-RateLimit-Limit": rateLimitResult.limit.toString(),
                "X-RateLimit-Remaining": Math.max(
                    0,
                    rateLimitResult.remaining - 1
                ).toString(),
                "X-RateLimit-Reset": rateLimitResult.resetAt.toISOString(),
            },
        })
    } catch (error) {
        console.error("LLM Stream Proxy Error:", error)
        return NextResponse.json(
            { error: "Internal server error", code: "INTERNAL_ERROR" },
            { status: 500 }
        )
    }
}
