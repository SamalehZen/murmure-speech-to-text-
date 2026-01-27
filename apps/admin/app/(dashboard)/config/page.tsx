import Link from "next/link"
import { prisma } from "@murmure/database"
import {
    type ShortcutConfig,
    type LLMSettings,
    type DictionaryEntry,
    type FormattingRule,
    type AppPrompt,
    DEFAULT_SHORTCUTS,
    DEFAULT_LLM_SETTINGS,
    DEFAULT_FORMATTING_RULES,
    DEFAULT_APP_PROMPTS,
} from "@murmure/shared"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Keyboard, Bot, FileText, BookOpen, AlignLeft, ArrowRight } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface ConfigCardProps {
    title: string
    description: string
    count: number | string
    icon: React.ReactNode
    href: string
}

function ConfigCard({ title, description, count, icon, href }: ConfigCardProps) {
    return (
        <Link href={href}>
            <Card className="transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                    {icon}
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{count}</div>
                    <p className="text-xs text-muted-foreground">{description}</p>
                    <div className="flex items-center gap-1 mt-3 text-sm text-primary">
                        Manage <ArrowRight className="h-4 w-4" />
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}

async function getConfig() {
    let config = await prisma.globalConfig.findUnique({
        where: { id: "global" },
    })

    if (!config) {
        config = await prisma.globalConfig.create({
            data: {
                id: "global",
                shortcuts: DEFAULT_SHORTCUTS,
                llmSettings: DEFAULT_LLM_SETTINGS,
                dictionary: [],
                formattingRules: DEFAULT_FORMATTING_RULES,
                appPrompts: DEFAULT_APP_PROMPTS,
            },
        })
    }

    return config
}

export default async function ConfigPage() {
    const config = await getConfig()

    const shortcuts = (config.shortcuts as unknown as ShortcutConfig[]) || []
    const llmSettings = (config.llmSettings as unknown as LLMSettings) || DEFAULT_LLM_SETTINGS
    const dictionary = (config.dictionary as unknown as DictionaryEntry[]) || []
    const formattingRules = (config.formattingRules as unknown as FormattingRule[]) || []
    const appPrompts = (config.appPrompts as unknown as AppPrompt[]) || []

    const enabledProviders = Object.entries(llmSettings.providers || {}).filter(
        ([, provider]) => provider?.enabled
    ).length

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    ⚙️ Global Configuration
                </h1>
                <p className="text-muted-foreground">
                    Changes apply to ALL users automatically
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <ConfigCard
                    title="Keyboard Shortcuts"
                    description="configured shortcuts"
                    count={shortcuts.length}
                    icon={<Keyboard className="h-4 w-4 text-muted-foreground" />}
                    href="/config/shortcuts"
                />

                <ConfigCard
                    title="LLM Settings"
                    description="active providers"
                    count={enabledProviders}
                    icon={<Bot className="h-4 w-4 text-muted-foreground" />}
                    href="/config/llm"
                />

                <ConfigCard
                    title="App Prompts"
                    description="app-specific prompts"
                    count={appPrompts.length}
                    icon={<FileText className="h-4 w-4 text-muted-foreground" />}
                    href="/config/prompts"
                />

                <ConfigCard
                    title="Dictionary"
                    description="words"
                    count={dictionary.length.toLocaleString()}
                    icon={<BookOpen className="h-4 w-4 text-muted-foreground" />}
                    href="/config/dictionary"
                />

                <ConfigCard
                    title="Formatting Rules"
                    description="active rules"
                    count={formattingRules.filter((r) => r.enabled).length}
                    icon={<AlignLeft className="h-4 w-4 text-muted-foreground" />}
                    href="/config/formatting"
                />
            </div>

            <p className="text-sm text-muted-foreground">
                Last updated: {formatDistanceToNow(new Date(config.updatedAt), { addSuffix: true })}
            </p>
        </div>
    )
}
