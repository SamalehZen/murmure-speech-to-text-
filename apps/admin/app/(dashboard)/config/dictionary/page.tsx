"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import {
    type DictionaryEntry,
    DICTIONARY_CATEGORIES,
    DICTIONARY_PRESETS,
} from "@murmure/shared"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import {
    ArrowLeft,
    Plus,
    Search,
    Trash2,
    Upload,
    Download,
    Loader2,
    ChevronDown,
    FileDown,
} from "lucide-react"

interface DictionaryEntryDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    entry: DictionaryEntry | null
    onSave: (entry: DictionaryEntry) => void
    isNew?: boolean
}

function DictionaryEntryDialog({
    open,
    onOpenChange,
    entry,
    onSave,
    isNew = false,
}: DictionaryEntryDialogProps) {
    const [spoken, setSpoken] = useState("")
    const [written, setWritten] = useState("")
    const [category, setCategory] = useState<string>("General")
    const [caseSensitive, setCaseSensitive] = useState(false)

    useEffect(() => {
        if (entry) {
            setSpoken(entry.spoken)
            setWritten(entry.written)
            setCategory(entry.category)
            setCaseSensitive(entry.caseSensitive)
        } else {
            setSpoken("")
            setWritten("")
            setCategory("General")
            setCaseSensitive(false)
        }
    }, [entry, open])

    const handleSave = () => {
        if (!spoken.trim() || !written.trim()) return

        onSave({
            id: entry?.id || crypto.randomUUID(),
            spoken: spoken.trim().toLowerCase(),
            written: written.trim(),
            category,
            caseSensitive,
        })
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>
                        {isNew ? "Add Dictionary Entry" : "Edit Entry"}
                    </DialogTitle>
                    <DialogDescription>
                        Map spoken words to their written form.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Spoken (as heard)</Label>
                        <Input
                            value={spoken}
                            onChange={(e) => setSpoken(e.target.value)}
                            placeholder="e.g., chat gpt"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Written (correct form)</Label>
                        <Input
                            value={written}
                            onChange={(e) => setWritten(e.target.value)}
                            placeholder="e.g., ChatGPT"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {DICTIONARY_CATEGORIES.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                        {cat}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2">
                        <Switch
                            id="case-sensitive"
                            checked={caseSensitive}
                            onCheckedChange={setCaseSensitive}
                        />
                        <Label htmlFor="case-sensitive">Case sensitive</Label>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!spoken.trim() || !written.trim()}
                    >
                        Save Entry
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function DictionaryPage() {
    const [dictionary, setDictionary] = useState<DictionaryEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [categoryFilter, setCategoryFilter] = useState<string>("all")
    const [editingEntry, setEditingEntry] = useState<DictionaryEntry | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [isNew, setIsNew] = useState(false)
    const [page, setPage] = useState(1)
    const pageSize = 20
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { toast } = useToast()

    useEffect(() => {
        fetchDictionary()
    }, [])

    const fetchDictionary = async () => {
        try {
            const res = await fetch("/api/config")
            const data = await res.json()
            setDictionary((data.dictionary as DictionaryEntry[]) || [])
        } catch {
            toast({
                title: "Error",
                description: "Failed to load dictionary",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const saveDictionary = async (newDictionary: DictionaryEntry[]) => {
        setSaving(true)
        try {
            const res = await fetch("/api/config", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dictionary: newDictionary }),
            })

            if (!res.ok) throw new Error("Failed to save")

            setDictionary(newDictionary)
            toast({
                title: "Success",
                description: "Dictionary saved successfully",
            })
        } catch {
            toast({
                title: "Error",
                description: "Failed to save dictionary",
                variant: "destructive",
            })
        } finally {
            setSaving(false)
        }
    }

    const handleAddEntry = () => {
        setEditingEntry(null)
        setIsNew(true)
        setDialogOpen(true)
    }

    const handleEditEntry = (entry: DictionaryEntry) => {
        setEditingEntry(entry)
        setIsNew(false)
        setDialogOpen(true)
    }

    const handleSaveEntry = (entry: DictionaryEntry) => {
        const newDictionary = isNew
            ? [...dictionary, entry]
            : dictionary.map((e) => (e.id === entry.id ? entry : e))
        saveDictionary(newDictionary)
    }

    const handleDeleteEntry = (id: string) => {
        const newDictionary = dictionary.filter((e) => e.id !== id)
        saveDictionary(newDictionary)
    }

    const handleImportPreset = (presetIndex: number) => {
        const preset = DICTIONARY_PRESETS[presetIndex]
        const newEntries = preset.words.map((word) => ({
            ...word,
            id: crypto.randomUUID(),
        }))

        const existingSpoken = new Set(dictionary.map((e) => e.spoken.toLowerCase()))
        const uniqueNewEntries = newEntries.filter(
            (e) => !existingSpoken.has(e.spoken.toLowerCase())
        )

        if (uniqueNewEntries.length === 0) {
            toast({
                title: "No new entries",
                description: "All entries from this preset already exist",
            })
            return
        }

        saveDictionary([...dictionary, ...uniqueNewEntries])
        toast({
            title: "Preset imported",
            description: `Added ${uniqueNewEntries.length} new entries`,
        })
    }

    const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string

                let entries: DictionaryEntry[]
                if (file.name.endsWith(".json")) {
                    entries = JSON.parse(content)
                } else if (file.name.endsWith(".csv")) {
                    const lines = content.split("\n").filter(Boolean)
                    const headers = lines[0].split(",")
                    entries = lines.slice(1).map((line) => {
                        const values = line.split(",")
                        return {
                            id: crypto.randomUUID(),
                            spoken: values[0]?.trim() || "",
                            written: values[1]?.trim() || "",
                            category: values[2]?.trim() || "General",
                            caseSensitive: values[3]?.trim().toLowerCase() === "true",
                        }
                    })
                } else {
                    throw new Error("Unsupported file format")
                }

                const existingSpoken = new Set(
                    dictionary.map((e) => e.spoken.toLowerCase())
                )
                const uniqueEntries = entries.filter(
                    (e) => e.spoken && !existingSpoken.has(e.spoken.toLowerCase())
                )

                saveDictionary([...dictionary, ...uniqueEntries])
                toast({
                    title: "Import successful",
                    description: `Added ${uniqueEntries.length} new entries`,
                })
            } catch {
                toast({
                    title: "Import failed",
                    description: "Invalid file format",
                    variant: "destructive",
                })
            }
        }
        reader.readAsText(file)

        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    const handleExport = (format: "json" | "csv") => {
        let content: string
        let mimeType: string
        let filename: string

        if (format === "json") {
            content = JSON.stringify(dictionary, null, 2)
            mimeType = "application/json"
            filename = "dictionary.json"
        } else {
            const headers = "spoken,written,category,caseSensitive"
            const rows = dictionary.map(
                (e) => `${e.spoken},${e.written},${e.category},${e.caseSensitive}`
            )
            content = [headers, ...rows].join("\n")
            mimeType = "text/csv"
            filename = "dictionary.csv"
        }

        const blob = new Blob([content], { type: mimeType })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
    }

    const filteredDictionary = dictionary.filter((entry) => {
        const matchesSearch =
            searchQuery === "" ||
            entry.spoken.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.written.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory =
            categoryFilter === "all" || entry.category === categoryFilter
        return matchesSearch && matchesCategory
    })

    const paginatedDictionary = filteredDictionary.slice(
        (page - 1) * pageSize,
        page * pageSize
    )
    const totalPages = Math.ceil(filteredDictionary.length / pageSize)

    const categories = Array.from(new Set(dictionary.map((e) => e.category)))

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
                            📖 Global Dictionary
                        </h1>
                        <p className="text-muted-foreground">
                            Words automatically corrected for all users
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImportFile}
                        accept=".json,.csv"
                        className="hidden"
                    />
                    <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={saving}
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Import
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" disabled={saving}>
                                <Download className="h-4 w-4 mr-2" />
                                Export
                                <ChevronDown className="h-4 w-4 ml-2" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleExport("json")}>
                                <FileDown className="h-4 w-4 mr-2" />
                                Export as JSON
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport("csv")}>
                                <FileDown className="h-4 w-4 mr-2" />
                                Export as CSV
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button onClick={handleAddEntry} disabled={saving}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Word
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search dictionary..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value)
                                    setPage(1)
                                }}
                                className="pl-9"
                            />
                        </div>
                        <Select
                            value={categoryFilter}
                            onValueChange={(v) => {
                                setCategoryFilter(v)
                                setPage(1)
                            }}
                        >
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                        {cat}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Spoken</TableHead>
                                <TableHead>Written</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedDictionary.map((entry) => (
                                <TableRow
                                    key={entry.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => handleEditEntry(entry)}
                                >
                                    <TableCell>{entry.spoken}</TableCell>
                                    <TableCell className="font-medium">
                                        {entry.written}
                                        {entry.caseSensitive && (
                                            <Badge variant="outline" className="ml-2 text-xs">
                                                Aa
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{entry.category}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleDeleteEntry(entry.id)
                                            }}
                                            disabled={saving}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {paginatedDictionary.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8">
                                        <p className="text-muted-foreground">
                                            {searchQuery || categoryFilter !== "all"
                                                ? "No entries match your search"
                                                : "No dictionary entries yet"}
                                        </p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-sm text-muted-foreground">
                                Showing {(page - 1) * pageSize + 1}-
                                {Math.min(page * pageSize, filteredDictionary.length)} of{" "}
                                {filteredDictionary.length} words
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(page - 1)}
                                    disabled={page === 1}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(page + 1)}
                                    disabled={page === totalPages}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Quick Import Presets</CardTitle>
                    <CardDescription>
                        Import predefined word lists for common use cases
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
                    {DICTIONARY_PRESETS.map((preset, index) => (
                        <Button
                            key={preset.name}
                            variant="outline"
                            onClick={() => handleImportPreset(index)}
                            disabled={saving}
                        >
                            Import {preset.name}
                        </Button>
                    ))}
                </CardContent>
            </Card>

            <DictionaryEntryDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                entry={editingEntry}
                onSave={handleSaveEntry}
                isNew={isNew}
            />
        </div>
    )
}
