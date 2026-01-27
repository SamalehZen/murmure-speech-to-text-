import { prisma } from "@murmure/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

async function getConfig() {
    let config = await prisma.globalConfig.findUnique({
        where: { id: "global" },
    })

    if (!config) {
        config = await prisma.globalConfig.create({
            data: { id: "global" },
        })
    }

    return config
}

export default async function ConfigPage() {
    const config = await getConfig()

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Configuration</h1>
                <p className="text-muted-foreground">
                    Global settings for the Murmure platform
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>LLM Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="rounded-lg bg-muted p-4 text-sm overflow-auto">
                            {JSON.stringify(config.llmSettings, null, 2)}
                        </pre>
                        <p className="mt-4 text-sm text-muted-foreground">
                            LLM configuration editor coming soon...
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Keyboard Shortcuts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="rounded-lg bg-muted p-4 text-sm overflow-auto">
                            {JSON.stringify(config.shortcuts, null, 2)}
                        </pre>
                        <p className="mt-4 text-sm text-muted-foreground">
                            Shortcut editor coming soon...
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Dictionary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="rounded-lg bg-muted p-4 text-sm overflow-auto max-h-48">
                            {JSON.stringify(config.dictionary, null, 2)}
                        </pre>
                        <p className="mt-4 text-sm text-muted-foreground">
                            Dictionary editor coming soon...
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Formatting Rules</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="rounded-lg bg-muted p-4 text-sm overflow-auto max-h-48">
                            {JSON.stringify(config.formattingRules, null, 2)}
                        </pre>
                        <p className="mt-4 text-sm text-muted-foreground">
                            Formatting rules editor coming soon...
                        </p>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>App-Specific Prompts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="rounded-lg bg-muted p-4 text-sm overflow-auto max-h-64">
                            {JSON.stringify(config.appPrompts, null, 2)}
                        </pre>
                        <p className="mt-4 text-sm text-muted-foreground">
                            Prompt editor coming soon...
                        </p>
                    </CardContent>
                </Card>
            </div>

            <p className="text-sm text-muted-foreground">
                Last updated:{" "}
                {new Date(config.updatedAt).toLocaleString()}
            </p>
        </div>
    )
}
