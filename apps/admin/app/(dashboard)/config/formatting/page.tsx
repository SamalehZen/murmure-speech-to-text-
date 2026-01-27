"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
    type FormattingRule,
    type FormattingRuleType,
    FORMATTING_RULE_TYPE_LABELS,
    DEFAULT_FORMATTING_RULES,
} from "@murmure/shared"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core"
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Plus, GripVertical, Pencil, Trash2, Loader2 } from "lucide-react"

interface SortableRuleItemProps {
    rule: FormattingRule
    onEdit: () => void
    onDelete: () => void
    onToggle: (enabled: boolean) => void
    disabled: boolean
}

function SortableRuleItem({
    rule,
    onEdit,
    onDelete,
    onToggle,
    disabled,
}: SortableRuleItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: rule.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    const getRuleExample = (type: FormattingRuleType): string => {
        switch (type) {
            case "capitalize":
                return "hello → Hello"
            case "punctuation":
                return "text → text."
            case "number_conversion":
                return "twelve → 12"
            case "contraction":
                return "dont → don't"
            case "filler_removal":
                return "um, uh → (removed)"
            case "custom":
                return "custom rule"
            default:
                return ""
        }
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-4 p-4 border rounded-lg bg-card ${
                !rule.enabled ? "opacity-60" : ""
            }`}
        >
            <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing touch-none"
                disabled={disabled}
            >
                <GripVertical className="h-5 w-5 text-muted-foreground" />
            </button>

            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className="font-medium">{rule.name}</span>
                    <Badge variant="outline">{FORMATTING_RULE_TYPE_LABELS[rule.type]}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                    Example: {getRuleExample(rule.type)}
                </p>
            </div>

            <Switch
                checked={rule.enabled}
                onCheckedChange={onToggle}
                disabled={disabled}
            />

            <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                disabled={disabled}
            >
                <Pencil className="h-4 w-4" />
            </Button>

            <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                disabled={disabled}
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    )
}

interface RuleEditorDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    rule: FormattingRule | null
    onSave: (rule: FormattingRule) => void
    isNew?: boolean
    nextOrder: number
}

function RuleEditorDialog({
    open,
    onOpenChange,
    rule,
    onSave,
    isNew = false,
    nextOrder,
}: RuleEditorDialogProps) {
    const [name, setName] = useState("")
    const [type, setType] = useState<FormattingRuleType>("capitalize")
    const [enabled, setEnabled] = useState(true)
    const [config, setConfig] = useState<Record<string, unknown>>({})

    useEffect(() => {
        if (rule) {
            setName(rule.name)
            setType(rule.type)
            setEnabled(rule.enabled)
            setConfig(rule.config || {})
        } else {
            setName("")
            setType("capitalize")
            setEnabled(true)
            setConfig({})
        }
    }, [rule, open])

    const handleSave = () => {
        if (!name.trim()) return

        onSave({
            id: rule?.id || crypto.randomUUID(),
            name: name.trim(),
            type,
            enabled,
            order: rule?.order || nextOrder,
            config: Object.keys(config).length > 0 ? config : undefined,
        })
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>
                        {isNew ? "Add Formatting Rule" : "Edit Rule"}
                    </DialogTitle>
                    <DialogDescription>
                        Configure how text should be formatted after transcription.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Rule Name</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Capitalize sentences"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Rule Type</Label>
                        <Select
                            value={type}
                            onValueChange={(v) => setType(v as FormattingRuleType)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(FORMATTING_RULE_TYPE_LABELS).map(
                                    ([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    )
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {type === "custom" && (
                        <div className="space-y-2">
                            <Label>Pattern (regex)</Label>
                            <Input
                                value={(config.pattern as string) || ""}
                                onChange={(e) =>
                                    setConfig({ ...config, pattern: e.target.value })
                                }
                                placeholder="e.g., \\b(word)\\b"
                            />
                            <Label>Replacement</Label>
                            <Input
                                value={(config.replacement as string) || ""}
                                onChange={(e) =>
                                    setConfig({ ...config, replacement: e.target.value })
                                }
                                placeholder="e.g., $1"
                            />
                        </div>
                    )}

                    {type === "number_conversion" && (
                        <div className="space-y-2">
                            <Label>Minimum number to convert</Label>
                            <Input
                                type="number"
                                value={(config.minNumber as number) || 10}
                                onChange={(e) =>
                                    setConfig({
                                        ...config,
                                        minNumber: parseInt(e.target.value),
                                    })
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                Numbers below this will stay as words (e.g., &quot;five&quot;)
                            </p>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <Switch
                            id="rule-enabled"
                            checked={enabled}
                            onCheckedChange={setEnabled}
                        />
                        <Label htmlFor="rule-enabled">Enabled</Label>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!name.trim()}>
                        Save Rule
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function FormattingRulesPage() {
    const [rules, setRules] = useState<FormattingRule[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [editingRule, setEditingRule] = useState<FormattingRule | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [isNew, setIsNew] = useState(false)
    const { toast } = useToast()

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    useEffect(() => {
        fetchRules()
    }, [])

    const fetchRules = async () => {
        try {
            const res = await fetch("/api/config")
            const data = await res.json()
            const loadedRules = data.formattingRules as FormattingRule[]
            setRules(
                loadedRules?.length > 0
                    ? loadedRules.sort((a, b) => a.order - b.order)
                    : DEFAULT_FORMATTING_RULES
            )
        } catch {
            toast({
                title: "Error",
                description: "Failed to load formatting rules",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const saveRules = async (newRules: FormattingRule[]) => {
        setSaving(true)
        try {
            const res = await fetch("/api/config", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ formattingRules: newRules }),
            })

            if (!res.ok) throw new Error("Failed to save")

            setRules(newRules)
            toast({
                title: "Success",
                description: "Formatting rules saved successfully",
            })
        } catch {
            toast({
                title: "Error",
                description: "Failed to save formatting rules",
                variant: "destructive",
            })
        } finally {
            setSaving(false)
        }
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = rules.findIndex((r) => r.id === active.id)
            const newIndex = rules.findIndex((r) => r.id === over.id)

            const reorderedRules = arrayMove(rules, oldIndex, newIndex).map(
                (rule, index) => ({
                    ...rule,
                    order: index + 1,
                })
            )

            saveRules(reorderedRules)
        }
    }

    const handleAddRule = () => {
        setEditingRule(null)
        setIsNew(true)
        setDialogOpen(true)
    }

    const handleEditRule = (rule: FormattingRule) => {
        setEditingRule(rule)
        setIsNew(false)
        setDialogOpen(true)
    }

    const handleSaveRule = (rule: FormattingRule) => {
        const newRules = isNew
            ? [...rules, rule]
            : rules.map((r) => (r.id === rule.id ? rule : r))
        saveRules(newRules)
    }

    const handleDeleteRule = (id: string) => {
        const newRules = rules
            .filter((r) => r.id !== id)
            .map((rule, index) => ({ ...rule, order: index + 1 }))
        saveRules(newRules)
    }

    const handleToggleRule = (id: string, enabled: boolean) => {
        const newRules = rules.map((r) =>
            r.id === id ? { ...r, enabled } : r
        )
        saveRules(newRules)
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
                            📐 Formatting Rules
                        </h1>
                        <p className="text-muted-foreground">
                            Auto-apply to all transcriptions
                        </p>
                    </div>
                </div>
                <Button onClick={handleAddRule} disabled={saving}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rule
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Rules</CardTitle>
                    <CardDescription>
                        Drag to reorder. Rules are applied in order from top to bottom.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={rules.map((r) => r.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-2">
                                {rules.map((rule) => (
                                    <SortableRuleItem
                                        key={rule.id}
                                        rule={rule}
                                        onEdit={() => handleEditRule(rule)}
                                        onDelete={() => handleDeleteRule(rule.id)}
                                        onToggle={(enabled) =>
                                            handleToggleRule(rule.id, enabled)
                                        }
                                        disabled={saving}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>

                    {rules.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">
                                No formatting rules configured
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Preview</CardTitle>
                    <CardDescription>
                        See how rules will affect transcriptions
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <Label className="text-xs text-muted-foreground">
                                Before:
                            </Label>
                            <p className="text-sm p-2 bg-muted rounded">
                                hello this is um a test transcription with twelve items dont you think
                            </p>
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground">
                                After (with enabled rules):
                            </Label>
                            <p className="text-sm p-2 bg-muted rounded">
                                {rules.reduce((text, rule) => {
                                    if (!rule.enabled) return text
                                    switch (rule.type) {
                                        case "capitalize":
                                            return text.charAt(0).toUpperCase() + text.slice(1)
                                        case "punctuation":
                                            return text.endsWith(".") ? text : text + "."
                                        case "number_conversion":
                                            return text.replace(/\btwelve\b/gi, "12")
                                        case "contraction":
                                            return text.replace(/\bdont\b/gi, "don't")
                                        case "filler_removal":
                                            return text.replace(/\b(um|uh)\b\s*/gi, "")
                                        default:
                                            return text
                                    }
                                }, "hello this is um a test transcription with twelve items dont you think")}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <RuleEditorDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                rule={editingRule}
                onSave={handleSaveRule}
                isNew={isNew}
                nextOrder={rules.length + 1}
            />
        </div>
    )
}
