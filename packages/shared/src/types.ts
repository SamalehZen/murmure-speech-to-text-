export type UserStatus = "ACTIVE" | "SUSPENDED" | "BLOCKED"

export type UserRole = "USER" | "ADMIN"

export type Plan = "FREE" | "PRO" | "BUSINESS"

export type SubscriptionStatus =
    | "ACTIVE"
    | "CANCELED"
    | "PAST_DUE"
    | "UNPAID"
    | "TRIALING"

export type LLMProvider = "OPENAI" | "ANTHROPIC" | "GOOGLE"

export interface User {
    id: string
    email: string
    name: string | null
    image: string | null
    status: UserStatus
    role: UserRole
    plan: Plan
    language: string
    createdAt: Date
    updatedAt: Date
    lastLoginAt: Date | null
}

export interface Subscription {
    id: string
    userId: string
    stripeCustomerId: string | null
    stripeSubscriptionId: string | null
    stripePriceId: string | null
    stripeCurrentPeriodEnd: Date | null
    status: SubscriptionStatus
    createdAt: Date
    updatedAt: Date
}

export interface UsageLog {
    id: string
    userId: string
    provider: LLMProvider
    model: string
    tokensIn: number
    tokensOut: number
    cost: number
    createdAt: Date
}

export interface Transcription {
    id: string
    userId: string
    originalText: string
    processedText: string | null
    language: string
    duration: number
    wordCount: number
    createdAt: Date
}

export interface GlobalConfig {
    id: string
    shortcuts: Record<string, unknown>
    llmSettings: Record<string, unknown>
    dictionary: string[]
    formattingRules: FormattingRule[]
    appPrompts: Record<string, string>
    updatedAt: Date
}

export interface FormattingRule {
    id: string
    pattern: string
    replacement: string
    enabled: boolean
}

export interface DailyUsage {
    id: string
    userId: string
    date: Date
    requests: number
}

export const PLAN_LIMITS: Record<Plan, number> = {
    FREE: 50,
    PRO: 500,
    BUSINESS: Infinity,
}

export interface SessionUser {
    id: string
    email: string
    name: string | null
    image: string | null
    role: UserRole
    status: UserStatus
}

export interface ApiResponse<T = unknown> {
    success: boolean
    data?: T
    error?: string
}

export interface PaginatedResponse<T> {
    items: T[]
    total: number
    page: number
    pageSize: number
    totalPages: number
}

export interface DashboardStats {
    totalUsers: number
    activeUsers: number
    totalTranscriptions: number
    totalTokensUsed: number
    revenue: number
}

export interface UsageStats {
    date: string
    requests: number
    tokensIn: number
    tokensOut: number
    cost: number
}
