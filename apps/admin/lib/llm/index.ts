import { callOpenAI, streamOpenAI, testOpenAIConnection } from "./openai"
import {
    callAnthropic,
    streamAnthropic,
    testAnthropicConnection,
} from "./anthropic"
import { callGoogle, streamGoogle, testGoogleConnection } from "./google"
import type {
    LLMProviderType,
    ProviderRequest,
    ProviderResponse,
    RouterRequest,
} from "./types"

export type { LLMProviderType }
export {
    callOpenAI,
    streamOpenAI,
    callAnthropic,
    streamAnthropic,
    callGoogle,
    streamGoogle,
}

type ProviderHandler = (request: ProviderRequest) => Promise<ProviderResponse>
type StreamHandler = (
    request: ProviderRequest
) => AsyncGenerator<string, void, unknown>

const providers: Record<LLMProviderType, ProviderHandler> = {
    openai: callOpenAI,
    anthropic: callAnthropic,
    google: callGoogle,
}

const streamProviders: Record<LLMProviderType, StreamHandler> = {
    openai: streamOpenAI,
    anthropic: streamAnthropic,
    google: streamGoogle,
}

const FALLBACK_ORDER: LLMProviderType[] = ["openai", "anthropic", "google"]

export async function routeToProvider(
    request: RouterRequest
): Promise<ProviderResponse> {
    const handler = providers[request.provider]

    if (!handler) {
        throw new Error(`Unknown provider: ${request.provider}`)
    }

    try {
        return await handler(request)
    } catch (error) {
        console.error(
            `Provider ${request.provider} failed:`,
            error instanceof Error ? error.message : error
        )

        const fallbackProviders = FALLBACK_ORDER.filter(
            (p) => p !== request.provider
        )

        for (const fallback of fallbackProviders) {
            try {
                console.log(`Falling back to ${fallback}`)
                return await providers[fallback](request)
            } catch (fallbackError) {
                console.error(
                    `Fallback ${fallback} failed:`,
                    fallbackError instanceof Error
                        ? fallbackError.message
                        : fallbackError
                )
                continue
            }
        }

        throw error
    }
}

export async function* routeToProviderStream(
    request: RouterRequest
): AsyncGenerator<string, void, unknown> {
    const handler = streamProviders[request.provider]

    if (!handler) {
        throw new Error(`Unknown provider: ${request.provider}`)
    }

    yield* handler(request)
}

export async function testProviderConnection(
    provider: LLMProviderType
): Promise<boolean> {
    const testers: Record<LLMProviderType, () => Promise<boolean>> = {
        openai: testOpenAIConnection,
        anthropic: testAnthropicConnection,
        google: testGoogleConnection,
    }

    const tester = testers[provider]
    if (!tester) {
        return false
    }

    return await tester()
}

export async function testAllProviders(): Promise<
    Record<LLMProviderType, boolean>
> {
    const [openai, anthropic, google] = await Promise.all([
        testProviderConnection("openai"),
        testProviderConnection("anthropic"),
        testProviderConnection("google"),
    ])

    return { openai, anthropic, google }
}
