"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { type AppPrompt, DEFAULT_APP_PROMPTS } from "@murmure/shared"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Play } from "lucide-react"

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
    ssr: false,
    loading: () => (
        <div className="h-[300px] flex items-center justify-center bg-muted rounded-md">
            <Loader2 className="h-6 w-6 animate-spin" />
        </div>
    ),
})

interface PromptEditorDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    prompt: AppPrompt | null
    onSave: (prompt: AppPrompt) => void
    onDelete?: (id: string) => void
    isNew?: boolean
}

function PromptEditorDialog({
    open,
    onOpenChange,
    prompt,
    onSave,
    onDelete,
    isNew = false,
}: PromptEditorDialogProps) {
    const [appName, setAppName] = useState("")
    const [processNames, setProcessNames] = useState("")
    const [windowTitleContains, setWindowTitleContains] = useState("")
    const [systemPrompt, setSystemPrompt] = useState("")
    const [enabled, setEnabled] = useState(true)
    const [testing, setTesting] = useState(false)
    const [testResult, setTestResult] = useState<string | null>(null)
    const { toast } = useToast()

    useEffect(() => {
        if (prompt) {
            setAppName(prompt.appName)
            setProcessNames(prompt.processNames.join(", "))
            setWindowTitleContains(prompt.windowTitleContains || "")
            setSystemPrompt(prompt.systemPrompt)
            setEnabled(prompt.enabled)
        } else {
            setAppName("")
            setProcessNames("")
            setWindowTitleContains("")
            setSystemPrompt(`Clean up and format the following speech transcription.

<instructions>
- Fix grammatical errors
- Improve readability
- Maintain the original meaning
</instructions>

User's transcription: {{transcription}}`)
            setEnabled(true)
        }
        setTestResult(null)
    }, [prompt, open])

    const handleTest = async () => {
        setTesting(true)
        setTestResult(null)

        try {
            const res = await fetch("/api/config/prompts/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    systemPrompt,
                    testText: "this is a test transcription with some errors",
                }),
            })

            const data = await res.json()
            if (res.ok) {
                setTestResult(data.result)
            } else {
                toast({
                    title: "Test failed",
                    description: data.error || "Could not test prompt",
                    variant: "destructive",
                })
            }
        } catch {
            toast({
                title: "Test failed",
                description: "Could not connect to the API",
                variant: "destructive",
            })
        } finally {
            setTesting(false)
        }
    }

    const handleSave = () => {
        if (!appName.trim() || !systemPrompt.trim()) {
            toast({
                title: "Validation error",
                description: "App name and prompt are required",
                variant: "destructive",
            })
            return
        }

        onSave({
            id: prompt?.id || crypto.randomUUID(),
            appName: appName.trim(),
            processNames: processNames.split(",").map((p) => p.trim()).filter(Boolean),
            windowTitleContains: windowTitleContains.trim() || undefined,
            systemPrompt,
            enabled,
        })
        onOpenChange(false)
    }

    const handleDelete = () => {
        if (prompt && onDelete) {
            onDelete(prompt.id)
            onOpenChange(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isNew ? "Add Application Prompt" : `Edit Prompt: ${prompt?.appName}`}
                    </DialogTitle>
                    <DialogDescription>
                        Configure application-specific prompt for text processing.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex items-center gap-2">
                        <Switch
                            id="prompt-enabled"
                            checked={enabled}
                            onCheckedChange={setEnabled}
                        />
                        <Label htmlFor="prompt-enabled">Enabled</Label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Application Name</Label>
                            <Input
                                value={appName}
                                onChange={(e) => setAppName(e.target.value)}
                                placeholder="e.g., Cursor, VS Code"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Window Title Contains</Label>
                            <Input
                                value={windowTitleContains}
                                onChange={(e) => setWindowTitleContains(e.target.value)}
                                placeholder="e.g., Cursor"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Process Names (comma separated)</Label>
                        <Input
                            value={processNames}
                            onChange={(e) => setProcessNames(e.target.value)}
                            placeholder="e.g., cursor.exe, Cursor.app"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>System Prompt</Label>
                        <div className="border rounded-md overflow-hidden">
                            <MonacoEditor
                                height="300px"
                                language="markdown"
                                theme="vs-dark"
                                value={systemPrompt}
                                onChange={(value) => setSystemPrompt(value || "")}
                                options={{
                                    minimap: { enabled: false },
                                    lineNumbers: "on",
                                    wordWrap: "on",
                                    fontSize: 13,
                                    scrollBeyondLastLine: false,
                                }}
                            />
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-xs text-muted-foreground">Variables:</span>
                            <Badge variant="outline" className="text-xs">{"{{transcription}}"}</Badge>
                            <Badge variant="outline" className="text-xs">{"{{language}}"}</Badge>
                            <Badge variant="outline" className="text-xs">{"{{app}}"}</Badge>
                        </div>
                    </div>

                    <div className="space-y-2">
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
                                Test Prompt
                            </Button>
                        </div>

                        {testResult && (
                            <div className="p-3 bg-muted rounded-md">
                                <Label className="text-xs">Test Result:</Label>
                                <p className="text-sm mt-1">{testResult}</p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="flex justify-between">
                    <div>
                        {!isNew && onDelete && (
                            <Button variant="destructive" onClick={handleDelete}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>Save Prompt</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function PromptsPage() {
    const [prompts, setPrompts] = useState<AppPrompt[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [editingPrompt, setEditingPrompt] = useState<AppPrompt | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [isNew, setIsNew] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        fetchPrompts()
    }, [])

    const fetchPrompts = async () => {
        try {
            const res = await fetch("/api/config")
            const data = await res.json()
            const loadedPrompts = data.appPrompts as AppPrompt[]
            setPrompts(loadedPrompts?.length > 0 ? loadedPrompts : DEFAULT_APP_PROMPTS)
        } catch {
            toast({
                title: "Error",
                description: "Failed to load prompts",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const savePrompts = async (newPrompts: AppPrompt[]) => {
        setSaving(true)
        try {
            const res = await fetch("/api/config", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ appPrompts: newPrompts }),
            })

            if (!res.ok) throw new Error("Failed to save")

            setPrompts(newPrompts)
            toast({
                title: "Success",
                description: "Prompts saved successfully",
            })
        } catch {
            toast({
                title: "Error",
                description: "Failed to save prompts",
                variant: "destructive",
            })
        } finally {
            setSaving(false)
        }
    }

    const handleAddPrompt = () => {
        setEditingPrompt(null)
        setIsNew(true)
        setDialogOpen(true)
    }

    const handleEditPrompt = (prompt: AppPrompt) => {
        setEditingPrompt(prompt)
        setIsNew(false)
        setDialogOpen(true)
    }

    const handleSavePrompt = (prompt: AppPrompt) => {
        const newPrompts = isNew
            ? [...prompts, prompt]
            : prompts.map((p) => (p.id === prompt.id ? prompt : p))
        savePrompts(newPrompts)
    }

    const handleDeletePrompt = (id: string) => {
        const newPrompts = prompts.filter((p) => p.id !== id)
        savePrompts(newPrompts)
    }

    const handleToggleEnabled = (id: string, enabled: boolean) => {
        const newPrompts = prompts.map((p) =>
            p.id === id ? { ...p, enabled } : p
        )
        savePrompts(newPrompts)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/config">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            📝 Application Prompts
                        </h1>
                        <p className="text-muted-foreground">
                            Custom prompts triggered based on active application
                        </p>
                    </div>
                </div>
                <Button onClick={handleAddPrompt} disabled={saving}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add App
                </Button>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>App Name</TableHead>
                                <TableHead>Prompt Preview</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {prompts.map((prompt) => (
                                <TableRow key={prompt.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{prompt.appName}</span>
                                            {prompt.appName === "Default" && (
                                                <Badge variant="secondary">Fallback</Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-[300px]">
                                        <span className="text-muted-foreground text-sm truncate block">
                                            {prompt.systemPrompt.slice(0, 50)}...
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={prompt.enabled}
                                            onCheckedChange={(enabled) =>
                                                handleToggleEnabled(prompt.id, enabled)
                                            }
                                            disabled={saving}
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEditPrompt(prompt)}
                                            disabled={saving}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <PromptEditorDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                prompt={editingPrompt}
                onSave={handleSavePrompt}
                onDelete={handleDeletePrompt}
                isNew={isNew}
            />
        </div>
    )
}
