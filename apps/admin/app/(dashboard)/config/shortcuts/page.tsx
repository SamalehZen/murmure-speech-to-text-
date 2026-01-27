"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
    type ShortcutConfig,
    type ShortcutAction,
    SHORTCUT_ACTION_LABELS,
    DEFAULT_SHORTCUTS,
} from "@murmure/shared"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Plus, Pencil, AlertTriangle, Loader2 } from "lucide-react"

const AVAILABLE_KEYS = [
    "Ctrl",
    "Alt",
    "Shift",
    "Meta",
    "Space",
    "Enter",
    "Tab",
    "Escape",
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
    "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
]

interface ShortcutEditorDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    shortcut: ShortcutConfig | null
    shortcuts: ShortcutConfig[]
    onSave: (shortcut: ShortcutConfig) => void
    isNew?: boolean
}

function ShortcutEditorDialog({
    open,
    onOpenChange,
    shortcut,
    shortcuts,
    onSave,
    isNew = false,
}: ShortcutEditorDialogProps) {
    const [keys, setKeys] = useState<string[]>([])
    const [action, setAction] = useState<ShortcutAction>("start_stop_record")
    const [enabled, setEnabled] = useState(true)
    const [isRecording, setIsRecording] = useState(false)
    const [conflict, setConflict] = useState<ShortcutConfig | null>(null)

    useEffect(() => {
        if (shortcut) {
            setKeys(shortcut.keys)
            setAction(shortcut.action)
            setEnabled(shortcut.enabled)
        } else {
            setKeys([])
            setAction("start_stop_record")
            setEnabled(true)
        }
        setConflict(null)
    }, [shortcut, open])

    useEffect(() => {
        const conflicting = shortcuts.find(
            (s) =>
                s.id !== shortcut?.id &&
                s.keys.length === keys.length &&
                s.keys.every((k, i) => k === keys[i])
        )
        setConflict(conflicting || null)
    }, [keys, shortcuts, shortcut])

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (!isRecording) return
            e.preventDefault()

            const newKeys: string[] = []
            if (e.ctrlKey) newKeys.push("Ctrl")
            if (e.altKey) newKeys.push("Alt")
            if (e.shiftKey) newKeys.push("Shift")
            if (e.metaKey) newKeys.push("Meta")

            const key = e.key.toUpperCase()
            if (
                !["CONTROL", "ALT", "SHIFT", "META"].includes(key) &&
                !newKeys.includes(key)
            ) {
                newKeys.push(key === " " ? "Space" : key)
            }

            if (newKeys.length > 0) {
                setKeys(newKeys)
            }
        },
        [isRecording]
    )

    useEffect(() => {
        if (isRecording) {
            window.addEventListener("keydown", handleKeyDown)
            return () => window.removeEventListener("keydown", handleKeyDown)
        }
    }, [isRecording, handleKeyDown])

    const handleSave = () => {
        if (keys.length === 0) return

        onSave({
            id: shortcut?.id || crypto.randomUUID(),
            action,
            keys,
            enabled,
        })
        onOpenChange(false)
    }

    const usedActions = shortcuts
        .filter((s) => s.id !== shortcut?.id)
        .map((s) => s.action)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {isNew ? "Add Shortcut" : `Edit Shortcut: ${shortcut ? SHORTCUT_ACTION_LABELS[shortcut.action] : ""}`}
                    </DialogTitle>
                    <DialogDescription>
                        Configure keyboard shortcut for this action.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {isNew && (
                        <div className="space-y-2">
                            <Label>Action</Label>
                            <Select
                                value={action}
                                onValueChange={(v) => setAction(v as ShortcutAction)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(SHORTCUT_ACTION_LABELS).map(
                                        ([value, label]) => (
                                            <SelectItem
                                                key={value}
                                                value={value}
                                                disabled={usedActions.includes(value as ShortcutAction)}
                                            >
                                                {label}
                                                {usedActions.includes(value as ShortcutAction) && " (in use)"}
                                            </SelectItem>
                                        )
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Current Shortcut</Label>
                        <div className="flex gap-1">
                            {shortcut?.keys.map((key, i) => (
                                <Badge key={i} variant="secondary">
                                    {key}
                                </Badge>
                            )) || <span className="text-muted-foreground">None</span>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>New Shortcut</Label>
                        <div
                            className={`border rounded-md p-4 text-center cursor-pointer transition-colors ${
                                isRecording
                                    ? "border-primary bg-primary/10"
                                    : "hover:border-primary/50"
                            }`}
                            onClick={() => setIsRecording(!isRecording)}
                        >
                            {isRecording ? (
                                <span className="text-primary">
                                    Press your desired key combination...
                                </span>
                            ) : keys.length > 0 ? (
                                <div className="flex justify-center gap-1">
                                    {keys.map((key, i) => (
                                        <Badge key={i} variant="outline">
                                            {key}
                                        </Badge>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-muted-foreground">
                                    Click to record shortcut
                                </span>
                            )}
                        </div>
                    </div>

                    {conflict && (
                        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm">
                                Conflict detected: &quot;{SHORTCUT_ACTION_LABELS[conflict.action]}&quot; uses{" "}
                                {conflict.keys.join(" + ")}
                            </span>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <Switch
                            id="enabled"
                            checked={enabled}
                            onCheckedChange={setEnabled}
                        />
                        <Label htmlFor="enabled">Enabled</Label>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={keys.length === 0 || !!conflict}>
                        Save Shortcut
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function ShortcutsPage() {
    const [shortcuts, setShortcuts] = useState<ShortcutConfig[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [editingShortcut, setEditingShortcut] = useState<ShortcutConfig | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [isNew, setIsNew] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        fetchShortcuts()
    }, [])

    const fetchShortcuts = async () => {
        try {
            const res = await fetch("/api/config")
            const data = await res.json()
            const loadedShortcuts = data.shortcuts as ShortcutConfig[]
            setShortcuts(loadedShortcuts?.length > 0 ? loadedShortcuts : DEFAULT_SHORTCUTS)
        } catch {
            toast({
                title: "Error",
                description: "Failed to load shortcuts",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const saveShortcuts = async (newShortcuts: ShortcutConfig[]) => {
        setSaving(true)
        try {
            const res = await fetch("/api/config", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ shortcuts: newShortcuts }),
            })

            if (!res.ok) throw new Error("Failed to save")

            setShortcuts(newShortcuts)
            toast({
                title: "Success",
                description: "Shortcuts saved and will sync to all users within 5 minutes",
            })
        } catch {
            toast({
                title: "Error",
                description: "Failed to save shortcuts",
                variant: "destructive",
            })
        } finally {
            setSaving(false)
        }
    }

    const handleEditShortcut = (shortcut: ShortcutConfig) => {
        setEditingShortcut(shortcut)
        setIsNew(false)
        setDialogOpen(true)
    }

    const handleAddShortcut = () => {
        setEditingShortcut(null)
        setIsNew(true)
        setDialogOpen(true)
    }

    const handleSaveShortcut = (shortcut: ShortcutConfig) => {
        const newShortcuts = isNew
            ? [...shortcuts, shortcut]
            : shortcuts.map((s) => (s.id === shortcut.id ? shortcut : s))
        saveShortcuts(newShortcuts)
    }

    const handleToggleEnabled = (id: string, enabled: boolean) => {
        const newShortcuts = shortcuts.map((s) =>
            s.id === id ? { ...s, enabled } : s
        )
        saveShortcuts(newShortcuts)
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
                            ⌨️ Keyboard Shortcuts
                        </h1>
                        <p className="text-muted-foreground flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            Changes sync to all users within 5 minutes
                        </p>
                    </div>
                </div>
                <Button onClick={handleAddShortcut} disabled={saving}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Shortcut
                </Button>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Action</TableHead>
                                <TableHead>Shortcut</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {shortcuts.map((shortcut) => (
                                <TableRow key={shortcut.id}>
                                    <TableCell className="font-medium">
                                        {SHORTCUT_ACTION_LABELS[shortcut.action]}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            {shortcut.keys.map((key, i) => (
                                                <Badge key={i} variant="secondary">
                                                    {key}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={shortcut.enabled}
                                            onCheckedChange={(enabled) =>
                                                handleToggleEnabled(shortcut.id, enabled)
                                            }
                                            disabled={saving}
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEditShortcut(shortcut)}
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

            <ShortcutEditorDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                shortcut={editingShortcut}
                shortcuts={shortcuts}
                onSave={handleSaveShortcut}
                isNew={isNew}
            />
        </div>
    )
}
