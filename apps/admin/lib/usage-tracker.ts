import { prisma } from "@murmure/database"
import type { LLMProvider } from "@prisma/client"
import type { LLMProviderType, TokenUsage } from "./llm/types"
import { getModelPricing } from "./llm/pricing"
import { mapProviderToEnum } from "./llm/types"

interface UsageData {
    userId: string
    provider: LLMProviderType
    model: string
    tokensIn: number
    tokensOut: number
    cost: number
}

export async function trackUsage(data: UsageData): Promise<void> {
    await prisma.usageLog.create({
        data: {
            userId: data.userId,
            provider: mapProviderToEnum(data.provider),
            model: data.model,
            tokensIn: data.tokensIn,
            tokensOut: data.tokensOut,
            cost: data.cost,
        },
    })
}

export function calculateCost(
    provider: LLMProviderType,
    usage: TokenUsage,
    model?: string
): number {
    const pricing = getModelPricing(provider, model || "default")

    const inputCost = (usage.promptTokens / 1000) * pricing.input
    const outputCost = (usage.completionTokens / 1000) * pricing.output

    return inputCost + outputCost
}

export async function getUserUsageSummary(
    userId: string,
    startDate?: Date,
    endDate?: Date
): Promise<{
    totalRequests: number
    totalTokensIn: number
    totalTokensOut: number
    totalCost: number
}> {
    const where: Record<string, unknown> = { userId }

    if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) {
            ;(where.createdAt as Record<string, unknown>).gte = startDate
        }
        if (endDate) {
            ;(where.createdAt as Record<string, unknown>).lte = endDate
        }
    }

    const aggregates = await prisma.usageLog.aggregate({
        where,
        _sum: {
            tokensIn: true,
            tokensOut: true,
            cost: true,
        },
        _count: true,
    })

    return {
        totalRequests: aggregates._count,
        totalTokensIn: aggregates._sum.tokensIn || 0,
        totalTokensOut: aggregates._sum.tokensOut || 0,
        totalCost: Number(aggregates._sum.cost || 0),
    }
}

export async function getUserUsageByProvider(
    userId: string,
    startDate?: Date,
    endDate?: Date
): Promise<
    Array<{
        provider: LLMProvider
        requests: number
        tokensIn: number
        tokensOut: number
        cost: number
    }>
> {
    const where: Record<string, unknown> = { userId }

    if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) {
            ;(where.createdAt as Record<string, unknown>).gte = startDate
        }
        if (endDate) {
            ;(where.createdAt as Record<string, unknown>).lte = endDate
        }
    }

    const results = await prisma.usageLog.groupBy({
        by: ["provider"],
        where,
        _sum: {
            tokensIn: true,
            tokensOut: true,
            cost: true,
        },
        _count: true,
    })

    return results.map((r) => ({
        provider: r.provider,
        requests: r._count,
        tokensIn: r._sum.tokensIn || 0,
        tokensOut: r._sum.tokensOut || 0,
        cost: Number(r._sum.cost || 0),
    }))
}
