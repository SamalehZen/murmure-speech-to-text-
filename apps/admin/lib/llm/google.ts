import { GoogleGenerativeAI } from "@google/generative-ai"
import type { ProviderRequest, ProviderResponse } from "./types"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "")

export async function callGoogle(
    request: ProviderRequest
): Promise<ProviderResponse> {
    const model = genAI.getGenerativeModel({
        model: request.model || "gemini-1.5-flash",
    })

    const result = await model.generateContent({
        contents: [
            {
                role: "user",
                parts: [{ text: request.prompt }],
            },
        ],
        systemInstruction: request.systemPrompt
            ? { parts: [{ text: request.systemPrompt }] }
            : undefined,
        generationConfig: {
            temperature: request.options.temperature,
            maxOutputTokens: request.options.maxTokens,
        },
    })

    const response = result.response
    const usage = response.usageMetadata

    return {
        text: response.text(),
        provider: "google",
        model: request.model || "gemini-1.5-flash",
        usage: {
            promptTokens: usage?.promptTokenCount || 0,
            completionTokens: usage?.candidatesTokenCount || 0,
            totalTokens: usage?.totalTokenCount || 0,
        },
    }
}

export async function* streamGoogle(
    request: ProviderRequest
): AsyncGenerator<string, void, unknown> {
    const model = genAI.getGenerativeModel({
        model: request.model || "gemini-1.5-flash",
    })

    const result = await model.generateContentStream({
        contents: [
            {
                role: "user",
                parts: [{ text: request.prompt }],
            },
        ],
        systemInstruction: request.systemPrompt
            ? { parts: [{ text: request.systemPrompt }] }
            : undefined,
        generationConfig: {
            temperature: request.options.temperature,
            maxOutputTokens: request.options.maxTokens,
        },
    })

    for await (const chunk of result.stream) {
        const text = chunk.text()
        if (text) {
            yield text
        }
    }
}

export async function testGoogleConnection(): Promise<boolean> {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
        await model.generateContent("Hi")
        return true
    } catch {
        return false
    }
}
