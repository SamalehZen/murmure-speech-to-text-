import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { type LLMProvider } from "@murmure/shared"

export async function POST(request: Request) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { provider, model } = body as { provider: LLMProvider; model: string }

    if (!provider || !model) {
        return NextResponse.json(
            { error: "Provider and model are required" },
            { status: 400 }
        )
    }

    try {
        let success = false

        switch (provider) {
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
                            model,
                            messages: [{ role: "user", content: "Say hello" }],
                            max_tokens: 10,
                        }),
                    }
                )

                success = response.ok
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
                            model,
                            messages: [{ role: "user", content: "Say hello" }],
                            max_tokens: 10,
                        }),
                    }
                )

                success = response.ok
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
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            contents: [
                                { parts: [{ text: "Say hello" }] },
                            ],
                        }),
                    }
                )

                success = response.ok
                break
            }

            default:
                return NextResponse.json(
                    { error: "Unknown provider" },
                    { status: 400 }
                )
        }

        if (success) {
            return NextResponse.json({ success: true })
        } else {
            return NextResponse.json(
                { error: "Connection test failed" },
                { status: 500 }
            )
        }
    } catch (error) {
        return NextResponse.json(
            { error: "Connection test failed" },
            { status: 500 }
        )
    }
}
