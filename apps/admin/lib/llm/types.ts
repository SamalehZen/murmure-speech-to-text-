import type { LLMProvider } from "@prisma/client"

export type LLMProviderType = "openai" | "anthropic" | "google"

export interface LLMRequest {
    prompt: string
    provider?: LLMProviderType
    model?: string
    options?: {
        temperature?: number
        maxTokens?: number
    }
}

export interface LLMResponse {
    text: string
    provider: LLMProviderType
    model: string
    usage: TokenUsage
}

export interface TokenUsage {
    promptTokens: number
    completionTokens: number
    totalTokens: number
}

export interface ProviderRequest {
    prompt: string
    systemPrompt?: string
    model?: string
    options: {
        temperature: number
        maxTokens: number
    }
}

export interface ProviderResponse {
    text: string
    provider: LLMProviderType
    model: string
    usage: TokenUsage
}

export interface RouterRequest extends ProviderRequest {
    provider: LLMProviderType
}

export interface LLMModel {
    id: string
    name: string
    provider: LLMProviderType
    maxTokens: number
    inputPrice: number
    outputPrice: number
}

export const ERROR_CODES = {
    UNAUTHORIZED: 401,
    ACCOUNT_INACTIVE: 403,
    RATE_LIMIT_EXCEEDED: 429,
    PROVIDER_ERROR: 502,
    INTERNAL_ERROR: 500,
    BAD_REQUEST: 400,
} as const

export type ErrorCode = keyof typeof ERROR_CODES

export function mapProviderToEnum(provider: LLMProviderType): LLMProvider {
    const mapping: Record<LLMProviderType, LLMProvider> = {
        openai: "OPENAI",
        anthropic: "ANTHROPIC",
        google: "GOOGLE",
    }
    return mapping[provider]
}
