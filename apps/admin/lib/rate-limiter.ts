import { prisma } from "@murmure/database"
import type { Plan } from "@prisma/client"

interface RateLimits {
    requestsPerDay: number
    tokensPerRequest: number
    tokensPerDay: number
}

const RATE_LIMITS: Record<Plan, RateLimits> = {
    FREE: {
        requestsPerDay: 50,
        tokensPerRequest: 1000,
        tokensPerDay: 50000,
    },
    PRO: {
        requestsPerDay: 500,
        tokensPerRequest: 2000,
        tokensPerDay: 500000,
    },
    BUSINESS: {
        requestsPerDay: Infinity,
        tokensPerRequest: 4000,
        tokensPerDay: Infinity,
    },
}

export interface RateLimitResult {
    allowed: boolean
    limit: number
    remaining: number
    resetAt: Date
}

function getStartOfDay(): Date {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
}

function getEndOfDay(): Date {
    const tomorrow = new Date()
    tomorrow.setHours(0, 0, 0, 0)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow
}

export async function checkRateLimit(
    userId: string,
    plan: Plan
): Promise<RateLimitResult> {
    const today = getStartOfDay()
    const tomorrow = getEndOfDay()
    const limit = RATE_LIMITS[plan].requestsPerDay

    if (limit === Infinity) {
        return {
            allowed: true,
            limit: -1,
            remaining: -1,
            resetAt: tomorrow,
        }
    }

    const usage = await prisma.dailyUsage.upsert({
        where: {
            userId_date: { userId, date: today },
        },
        update: {},
        create: {
            userId,
            date: today,
            requests: 0,
        },
    })

    const remaining = Math.max(0, limit - usage.requests)

    return {
        allowed: usage.requests < limit,
        limit,
        remaining,
        resetAt: tomorrow,
    }
}

export async function incrementUsage(userId: string): Promise<void> {
    const today = getStartOfDay()

    await prisma.dailyUsage.upsert({
        where: {
            userId_date: { userId, date: today },
        },
        update: {
            requests: { increment: 1 },
        },
        create: {
            userId,
            date: today,
            requests: 1,
        },
    })
}

export async function getRemainingRequests(
    userId: string,
    plan: Plan
): Promise<{ remaining: number; limit: number; resetAt: Date }> {
    const result = await checkRateLimit(userId, plan)
    return {
        remaining: result.remaining,
        limit: result.limit,
        resetAt: result.resetAt,
    }
}

export function getMaxTokensForPlan(
    plan: Plan,
    requestedTokens?: number
): number {
    const maxAllowed = RATE_LIMITS[plan].tokensPerRequest

    if (requestedTokens === undefined || requestedTokens === null) {
        return maxAllowed
    }

    return Math.min(requestedTokens, maxAllowed)
}

export function getRateLimitsForPlan(plan: Plan): RateLimits {
    return RATE_LIMITS[plan]
}
