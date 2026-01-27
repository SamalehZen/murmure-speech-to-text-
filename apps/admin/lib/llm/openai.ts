import OpenAI from "openai"
import type { ProviderRequest, ProviderResponse } from "./types"

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function callOpenAI(
    request: ProviderRequest
): Promise<ProviderResponse> {
    const response = await openai.chat.completions.create({
        model: request.model || "gpt-4-turbo",
        messages: [
            ...(request.systemPrompt
                ? [{ role: "system" as const, content: request.systemPrompt }]
                : []),
            { role: "user" as const, content: request.prompt },
        ],
        temperature: request.options.temperature,
        max_tokens: request.options.maxTokens,
    })

    return {
        text: response.choices[0]?.message?.content || "",
        provider: "openai",
        model: response.model,
        usage: {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0,
        },
    }
}

export async function* streamOpenAI(
    request: ProviderRequest
): AsyncGenerator<string, void, unknown> {
    const stream = await openai.chat.completions.create({
        model: request.model || "gpt-4-turbo",
        messages: [
            ...(request.systemPrompt
                ? [{ role: "system" as const, content: request.systemPrompt }]
                : []),
            { role: "user" as const, content: request.prompt },
        ],
        temperature: request.options.temperature,
        max_tokens: request.options.maxTokens,
        stream: true,
    })

    for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
            yield content
        }
    }
}

export async function testOpenAIConnection(): Promise<boolean> {
    try {
        await openai.models.list()
        return true
    } catch {
        return false
    }
}
