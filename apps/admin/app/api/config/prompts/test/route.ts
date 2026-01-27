import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@murmure/database"
import { type LLMSettings, DEFAULT_LLM_SETTINGS } from "@murmure/shared"

export async function POST(request: Request) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { systemPrompt, testText } = body as {
        systemPrompt: string
        testText: string
    }

    if (!systemPrompt || !testText) {
        return NextResponse.json(
            { error: "System prompt and test text are required" },
            { status: 400 }
        )
    }

    try {
        const config = await prisma.globalConfig.findUnique({
            where: { id: "global" },
        })

        const llmSettings = (config?.llmSettings as unknown as LLMSettings) || DEFAULT_LLM_SETTINGS
        const defaultProvider = llmSettings.defaultProvider
        const providerConfig = llmSettings.providers[defaultProvider]

        if (!providerConfig?.enabled) {
            return NextResponse.json(
                { error: "No LLM provider enabled" },
                { status: 400 }
            )
        }

        const promptWithText = systemPrompt.replace(
            "{{transcription}}",
            testText
        )

        let result: string

        switch (defaultProvider) {
            case "openai": {
                const apiKey = process.env.OPENAI_API_KEY
                if (!apiKey) {
                    return NextResponse.json(
                        { error: "OpenAI API key not configured" },
                        { status: 400 }
                    )
                }

                const response = await fetch(
                    "https://api.openai.com/v1/chat/completions",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${apiKey}`,
                        },
                        body: JSON.stringify({
                            model: providerConfig.model,
                            messages: [
                                { role: "system", content: promptWithText },
                            ],
                            max_tokens: providerConfig.maxTokens,
                            temperature: providerConfig.temperature,
                        }),
                    }
                )

                if (!response.ok) {
                    return NextResponse.json(
                        { error: "OpenAI API error" },
                        { status: 500 }
                    )
                }

                const data = await response.json()
                result = data.choices?.[0]?.message?.content || "No response"
                break
            }

            case "anthropic": {
                const apiKey = process.env.ANTHROPIC_API_KEY
                if (!apiKey) {
                    return NextResponse.json(
                        { error: "Anthropic API key not configured" },
                        { status: 400 }
                    )
                }

                const response = await fetch(
                    "https://api.anthropic.com/v1/messages",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "x-api-key": apiKey,
                            "anthropic-version": "2023-06-01",
                        },
                        body: JSON.stringify({
                            model: providerConfig.model,
                            system: promptWithText,
                            messages: [
                                { role: "user", content: "Process the transcription above." },
                            ],
                            max_tokens: providerConfig.maxTokens,
                        }),
                    }
                )

                if (!response.ok) {
                    return NextResponse.json(
                        { error: "Anthropic API error" },
                        { status: 500 }
                    )
                }

                const data = await response.json()
                result = data.content?.[0]?.text || "No response"
                break
            }

            case "google": {
                const apiKey = process.env.GOOGLE_AI_API_KEY
                if (!apiKey) {
                    return NextResponse.json(
                        { error: "Google AI API key not configured" },
                        { status: 400 }
                    )
                }

                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${providerConfig.model}:generateContent?key=${apiKey}`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: promptWithText }] }],
                            generationConfig: {
                                maxOutputTokens: providerConfig.maxTokens,
                                temperature: providerConfig.temperature,
                            },
                        }),
                    }
                )

                if (!response.ok) {
                    return NextResponse.json(
                        { error: "Google AI API error" },
                        { status: 500 }
                    )
                }

                const data = await response.json()
                result =
                    data.candidates?.[0]?.content?.parts?.[0]?.text ||
                    "No response"
                break
            }

            default:
                return NextResponse.json(
                    { error: "Unknown provider" },
                    { status: 400 }
                )
        }

        return NextResponse.json({ result })
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to test prompt" },
            { status: 500 }
        )
    }
}
