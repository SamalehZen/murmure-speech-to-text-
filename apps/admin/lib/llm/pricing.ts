import type { LLMProviderType, LLMModel } from "./types"

interface PriceTier {
    input: number
    output: number
}

type ProviderPricing = Record<string, PriceTier>

export const PRICING: Record<LLMProviderType, ProviderPricing> = {
    openai: {
        "gpt-4-turbo": { input: 0.01, output: 0.03 },
        "gpt-4": { input: 0.03, output: 0.06 },
        "gpt-4o": { input: 0.005, output: 0.015 },
        "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
        "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },
        default: { input: 0.01, output: 0.03 },
    },
    anthropic: {
        "claude-3-opus-20240229": { input: 0.015, output: 0.075 },
        "claude-3-sonnet-20240229": { input: 0.003, output: 0.015 },
        "claude-3-5-sonnet-20241022": { input: 0.003, output: 0.015 },
        "claude-3-haiku-20240307": { input: 0.00025, output: 0.00125 },
        default: { input: 0.003, output: 0.015 },
    },
    google: {
        "gemini-pro": { input: 0.00025, output: 0.0005 },
        "gemini-1.5-pro": { input: 0.00125, output: 0.005 },
        "gemini-1.5-flash": { input: 0.000075, output: 0.0003 },
        default: { input: 0.00025, output: 0.0005 },
    },
}

export const AVAILABLE_MODELS: LLMModel[] = [
    {
        id: "gpt-4-turbo",
        name: "GPT-4 Turbo",
        provider: "openai",
        maxTokens: 128000,
        inputPrice: 0.01,
        outputPrice: 0.03,
    },
    {
        id: "gpt-4o",
        name: "GPT-4o",
        provider: "openai",
        maxTokens: 128000,
        inputPrice: 0.005,
        outputPrice: 0.015,
    },
    {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        provider: "openai",
        maxTokens: 128000,
        inputPrice: 0.00015,
        outputPrice: 0.0006,
    },
    {
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        provider: "openai",
        maxTokens: 16385,
        inputPrice: 0.0005,
        outputPrice: 0.0015,
    },
    {
        id: "claude-3-5-sonnet-20241022",
        name: "Claude 3.5 Sonnet",
        provider: "anthropic",
        maxTokens: 200000,
        inputPrice: 0.003,
        outputPrice: 0.015,
    },
    {
        id: "claude-3-opus-20240229",
        name: "Claude 3 Opus",
        provider: "anthropic",
        maxTokens: 200000,
        inputPrice: 0.015,
        outputPrice: 0.075,
    },
    {
        id: "claude-3-sonnet-20240229",
        name: "Claude 3 Sonnet",
        provider: "anthropic",
        maxTokens: 200000,
        inputPrice: 0.003,
        outputPrice: 0.015,
    },
    {
        id: "claude-3-haiku-20240307",
        name: "Claude 3 Haiku",
        provider: "anthropic",
        maxTokens: 200000,
        inputPrice: 0.00025,
        outputPrice: 0.00125,
    },
    {
        id: "gemini-1.5-pro",
        name: "Gemini 1.5 Pro",
        provider: "google",
        maxTokens: 2000000,
        inputPrice: 0.00125,
        outputPrice: 0.005,
    },
    {
        id: "gemini-1.5-flash",
        name: "Gemini 1.5 Flash",
        provider: "google",
        maxTokens: 1000000,
        inputPrice: 0.000075,
        outputPrice: 0.0003,
    },
    {
        id: "gemini-pro",
        name: "Gemini Pro",
        provider: "google",
        maxTokens: 32760,
        inputPrice: 0.00025,
        outputPrice: 0.0005,
    },
]

export function getModelPricing(
    provider: LLMProviderType,
    model: string
): PriceTier {
    const providerPricing = PRICING[provider]
    return providerPricing[model] || providerPricing.default
}
