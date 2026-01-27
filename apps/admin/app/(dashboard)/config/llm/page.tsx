"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
    type LLMSettings,
    type LLMProvider,
    type ProviderConfig,
    LLM_PROVIDER_LABELS,
    DEFAULT_PROVIDER_MODELS,
    DEFAULT_LLM_SETTINGS,
} from "@murmure/shared"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Settings, Loader2, CheckCircle, XCircle, Play, GripVertical } from "lucide-react"

interface ProviderCardProps {
    provider: LLMProvider
    config: ProviderConfig | undefined
    onConfigure: () => void
    onToggle: (enabled: boolean) => void
}

function ProviderCard({ provider, config, onConfigure, onToggle }: ProviderCardProps) {
    return (
        <Card className={config?.enabled ? "border-primary/50" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                    <Switch
                        checked={config?.enabled || false}
                        onCheckedChange={onToggle}
                    />
                    <div>
                        <CardTitle className="text-lg">{LLM_PROVIDER_LABELS[provider]}</CardTitle>
                        {config?.enabled && (
                            <CardDescription>
                                Model: {config.model}
                            </CardDescription>
                        )}
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={onConfigure}>
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                </Button>
            </CardHeader>
            {config?.enabled && (
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-muted-foreground">Temperature:</span>{" "}
                            {config.temperature}
                        </div>
                        <div>
                            <span className="text-muted-foreground">Max tokens:</span>{" "}
                            {config.maxTokens}
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
    )
}

interface ProviderConfigDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    provider: LLMProvider | null
    config: ProviderConfig | undefined
    onSave: (provider: LLMProvider, config: ProviderConfig) => void
}

function ProviderConfigDialog({
    open,
    onOpenChange,
    provider,
    config,
    onSave,
}: ProviderConfigDialogProps) {
    const [model, setModel] = useState("")
    const [temperature, setTemperature] = useState(0.7)
    const [maxTokens, setMaxTokens] = useState(2000)
    const [enabled, setEnabled] = useState(false)
    const [testing, setTesting] = useState(false)
    const [testResult, setTestResult] = useState<"success" | "error" | null>(null)
    const { toast } = useToast()

    useEffect(() => {
        if (provider && config) {
            setModel(config.model)
            setTemperature(config.temperature)
            setMaxTokens(config.maxTokens)
            setEnabled(config.enabled)
        } else if (provider) {
            setModel(DEFAULT_PROVIDER_MODELS[provider][0])
            setTemperature(0.7)
            setMaxTokens(2000)
            setEnabled(false)
        }
        setTestResult(null)
    }, [provider, config, open])

    const handleTest = async () => {
        if (!provider) return
        setTesting(true)
        setTestResult(null)

        try {
            const res = await fetch("/api/config/llm/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ provider, model }),
            })

            if (res.ok) {
                setTestResult("success")
                toast({
                    title: "Connection successful",
                    description: `${LLM_PROVIDER_LABELS[provider]} is configured correctly.`,
                })
            } else {
                setTestResult("error")
                toast({
                    title: "Connection failed",
                    description: "Please check your API configuration.",
                    variant: "destructive",
                })
            }
        } catch {
            setTestResult("error")
            toast({
                title: "Test failed",
                description: "Could not connect to the provider.",
                variant: "destructive",
            })
        } finally {
            setTesting(false)
        }
    }

    const handleSave = () => {
        if (!provider) return
        onSave(provider, { model, temperature, maxTokens, enabled })
        onOpenChange(false)
    }

    if (!provider) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Configure {LLM_PROVIDER_LABELS[provider]}</DialogTitle>
                    <DialogDescription>
                        Set the model and parameters for this provider.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex items-center gap-2">
                        <Switch
                            id="provider-enabled"
                            checked={enabled}
                            onCheckedChange={setEnabled}
                        />
                        <Label htmlFor="provider-enabled">Enable this provider</Label>
                    </div>

                    <div className="space-y-2">
                        <Label>Model</Label>
                        <Select value={model} onValueChange={setModel}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {DEFAULT_PROVIDER_MODELS[provider].map((m) => (
                                    <SelectItem key={m} value={m}>
                                        {m}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Temperature ({temperature})</Label>
                        <Input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={temperature}
                            onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        />
                        <p className="text-xs text-muted-foreground">
                            Lower = more focused, higher = more creative
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Max Tokens</Label>
                        <Input
                            type="number"
                            min="100"
                            max="8000"
                            value={maxTokens}
                            onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={handleTest}
                            disabled={testing}
                        >
                            {testing ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Play className="h-4 w-4 mr-2" />
                            )}
                            Test Connection
                        </Button>
                        {testResult === "success" && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                        {testResult === "error" && (
                            <XCircle className="h-5 w-5 text-destructive" />
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>Save Configuration</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function LLMSettingsPage() {
    const [settings, setSettings] = useState<LLMSettings>(DEFAULT_LLM_SETTINGS)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [configDialog, setConfigDialog] = useState<{
        open: boolean
        provider: LLMProvider | null
    }>({ open: false, provider: null })
    const { toast } = useToast()

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/config")
            const data = await res.json()
            const llmSettings = data.llmSettings as LLMSettings
            setSettings(llmSettings?.defaultProvider ? llmSettings : DEFAULT_LLM_SETTINGS)
        } catch {
            toast({
                title: "Error",
                description: "Failed to load LLM settings",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const saveSettings = async (newSettings: LLMSettings) => {
        setSaving(true)
        try {
            const res = await fetch("/api/config", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ llmSettings: newSettings }),
            })

            if (!res.ok) throw new Error("Failed to save")

            setSettings(newSettings)
            toast({
                title: "Success",
                description: "LLM settings saved successfully",
            })
        } catch {
            toast({
                title: "Error",
                description: "Failed to save LLM settings",
                variant: "destructive",
            })
        } finally {
            setSaving(false)
        }
    }

    const handleToggleProvider = (provider: LLMProvider, enabled: boolean) => {
        const newSettings = {
            ...settings,
            providers: {
                ...settings.providers,
                [provider]: {
                    ...settings.providers[provider],
                    enabled,
                    model: settings.providers[provider]?.model || DEFAULT_PROVIDER_MODELS[provider][0],
                    temperature: settings.providers[provider]?.temperature || 0.7,
                    maxTokens: settings.providers[provider]?.maxTokens || 2000,
                },
            },
        }
        saveSettings(newSettings)
    }

    const handleSaveProviderConfig = (provider: LLMProvider, config: ProviderConfig) => {
        const newSettings = {
            ...settings,
            providers: {
                ...settings.providers,
                [provider]: config,
            },
        }
        saveSettings(newSettings)
    }

    const handleDefaultProviderChange = (provider: LLMProvider) => {
        const newSettings = {
            ...settings,
            defaultProvider: provider,
        }
        saveSettings(newSettings)
    }

    const providers: LLMProvider[] = ["openai", "anthropic", "google"]
    const enabledProviders = providers.filter((p) => settings.providers[p]?.enabled)

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/config">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        🤖 LLM Configuration
                    </h1>
                    <p className="text-muted-foreground">
                        Configure AI providers for text processing
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Active Providers</CardTitle>
                    <CardDescription>
                        Enable and configure LLM providers for transcription processing
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {providers.map((provider) => (
                        <ProviderCard
                            key={provider}
                            provider={provider}
                            config={settings.providers[provider]}
                            onConfigure={() =>
                                setConfigDialog({ open: true, provider })
                            }
                            onToggle={(enabled) =>
                                handleToggleProvider(provider, enabled)
                            }
                        />
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Provider Priority</CardTitle>
                    <CardDescription>
                        Set the default provider and fallback order
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Default Provider</Label>
                        <Select
                            value={settings.defaultProvider}
                            onValueChange={(v) =>
                                handleDefaultProviderChange(v as LLMProvider)
                            }
                            disabled={saving}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {enabledProviders.length === 0 ? (
                                    <SelectItem value="none" disabled>
                                        No providers enabled
                                    </SelectItem>
                                ) : (
                                    enabledProviders.map((provider) => (
                                        <SelectItem key={provider} value={provider}>
                                            {LLM_PROVIDER_LABELS[provider]}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Fallback Order</Label>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {settings.fallbackOrder
                                .filter((p) => settings.providers[p]?.enabled)
                                .map((provider, i, arr) => (
                                    <span key={provider} className="flex items-center gap-2">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <span className="px-2 py-1 bg-muted rounded">
                                                        {LLM_PROVIDER_LABELS[provider]}
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Priority {i + 1}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        {i < arr.length - 1 && <span>→</span>}
                                    </span>
                                ))}
                            {settings.fallbackOrder.filter((p) => settings.providers[p]?.enabled)
                                .length === 0 && (
                                <span>No providers enabled</span>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <ProviderConfigDialog
                open={configDialog.open}
                onOpenChange={(open) =>
                    setConfigDialog({ ...configDialog, open })
                }
                provider={configDialog.provider}
                config={
                    configDialog.provider
                        ? settings.providers[configDialog.provider]
                        : undefined
                }
                onSave={handleSaveProviderConfig}
            />
        </div>
    )
}
