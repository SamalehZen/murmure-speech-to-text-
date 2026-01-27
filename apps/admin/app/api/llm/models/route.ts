import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { AVAILABLE_MODELS } from "@/lib/llm/pricing"
import { testAllProviders } from "@/lib/llm"
import type { LLMProviderType } from "@/lib/llm/types"

export async function GET(request: Request) {
    const session = await auth()

    if (!session?.user) {
        return NextResponse.json(
            { error: "Unauthorized", code: "UNAUTHORIZED" },
            { status: 401 }
        )
    }

    const { searchParams } = new URL(request.url)
    const provider = searchParams.get("provider") as LLMProviderType | null
    const checkStatus = searchParams.get("checkStatus") === "true"

    let models = AVAILABLE_MODELS

    if (provider) {
        models = models.filter((m) => m.provider === provider)
    }

    const response: {
        models: typeof AVAILABLE_MODELS
        providerStatus?: Record<LLMProviderType, boolean>
    } = { models }

    if (checkStatus) {
        response.providerStatus = await testAllProviders()
    }

    return NextResponse.json(response)
}
