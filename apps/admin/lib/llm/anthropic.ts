import Anthropic from "@anthropic-ai/sdk"
import type { ProviderRequest, ProviderResponse } from "./types"

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function callAnthropic(
    request: ProviderRequest
): Promise<ProviderResponse> {
    const response = await anthropic.messages.create({
        model: request.model || "claude-3-5-sonnet-20241022",
        max_tokens: request.options.maxTokens,
        system: request.systemPrompt || undefined,
        messages: [{ role: "user", content: request.prompt }],
    })

    const textContent = response.content.find((c) => c.type === "text")

    return {
        text: textContent?.type === "text" ? textContent.text : "",
        provider: "anthropic",
        model: response.model,
        usage: {
            promptTokens: response.usage.input_tokens,
            completionTokens: response.usage.output_tokens,
            totalTokens:
                response.usage.input_tokens + response.usage.output_tokens,
        },
    }
}

export async function* streamAnthropic(
    request: ProviderRequest
): AsyncGenerator<string, void, unknown> {
    const stream = anthropic.messages.stream({
        model: request.model || "claude-3-5-sonnet-20241022",
        max_tokens: request.options.maxTokens,
        system: request.systemPrompt || undefined,
        messages: [{ role: "user", content: request.prompt }],
    })

    for await (const event of stream) {
        if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
        ) {
            yield event.delta.text
        }
    }
}

export async function testAnthropicConnection(): Promise<boolean> {
    try {
        await anthropic.messages.create({
            model: "claude-3-haiku-20240307",
            max_tokens: 10,
            messages: [{ role: "user", content: "Hi" }],
        })
        return true
    } catch {
        return false
    }
}
