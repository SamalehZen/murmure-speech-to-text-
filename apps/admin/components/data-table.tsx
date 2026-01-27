"use client"

import * as React from "react"
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Search,
} from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"

interface ColumnDef<T> {
    key: string
    header: string
    cell?: (row: T) => React.ReactNode
    sortable?: boolean
}

interface FilterConfig {
    key: string
    label: string
    options: Array<{ value: string; label: string }>
}

interface DataTableProps<T> {
    columns: ColumnDef<T>[]
    data: T[]
    searchKey?: string
    searchPlaceholder?: string
    pagination?: {
        page: number
        pageSize: number
        total: number
        totalPages: number
    }
    onPageChange?: (page: number) => void
    onPageSizeChange?: (pageSize: number) => void
    onSearchChange?: (search: string) => void
    filters?: FilterConfig[]
    onFilterChange?: (key: string, value: string | null) => void
    filterValues?: Record<string, string | null>
    selectable?: boolean
    selectedIds?: string[]
    onSelectionChange?: (ids: string[]) => void
    getRowId?: (row: T) => string
    loading?: boolean
}

export function DataTable<T extends Record<string, unknown>>({
    columns,
    data,
    searchKey,
    searchPlaceholder = "Search...",
    pagination,
    onPageChange,
    onPageSizeChange,
    onSearchChange,
    filters = [],
    onFilterChange,
    filterValues = {},
    selectable = false,
    selectedIds = [],
    onSelectionChange,
    getRowId = (row) => row.id as string,
    loading = false,
}: DataTableProps<T>) {
    const [searchValue, setSearchValue] = React.useState("")

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchValue(e.target.value)
        onSearchChange?.(e.target.value)
    }

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            onSelectionChange?.(data.map(getRowId))
        } else {
            onSelectionChange?.([])
        }
    }

    const handleSelectRow = (rowId: string, checked: boolean) => {
        if (checked) {
            onSelectionChange?.([...selectedIds, rowId])
        } else {
            onSelectionChange?.(selectedIds.filter((id) => id !== rowId))
        }
    }

    const allSelected = data.length > 0 && selectedIds.length === data.length
    const someSelected = selectedIds.length > 0 && selectedIds.length < data.length

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
                {searchKey !== undefined && (
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder={searchPlaceholder}
                            value={searchValue}
                            onChange={handleSearchChange}
                            className="pl-9"
                        />
                    </div>
                )}
                {filters.map((filter) => (
                    <Select
                        key={filter.key}
                        value={filterValues[filter.key] || "all"}
                        onValueChange={(value) =>
                            onFilterChange?.(
                                filter.key,
                                value === "all" ? null : value
                            )
                        }
                    >
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder={filter.label} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All {filter.label}</SelectItem>
                            {filter.options.map((option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ))}
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {selectable && (
                                <TableHead className="w-[50px]">
                                    <Checkbox
                                        checked={allSelected}
                                        ref={(ref) => {
                                            if (ref) {
                                                (ref as unknown as HTMLInputElement).indeterminate = someSelected
                                            }
                                        }}
                                        onCheckedChange={handleSelectAll}
                                    />
                                </TableHead>
                            )}
                            {columns.map((column) => (
                                <TableHead key={column.key}>
                                    {column.header}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    {selectable && (
                                        <TableCell>
                                            <Skeleton className="h-4 w-4" />
                                        </TableCell>
                                    )}
                                    {columns.map((column) => (
                                        <TableCell key={column.key}>
                                            <Skeleton className="h-4 w-full" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={
                                        columns.length + (selectable ? 1 : 0)
                                    }
                                    className="h-24 text-center"
                                >
                                    No results found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((row) => {
                                const rowId = getRowId(row)
                                const isSelected = selectedIds.includes(rowId)
                                return (
                                    <TableRow
                                        key={rowId}
                                        data-state={isSelected && "selected"}
                                    >
                                        {selectable && (
                                            <TableCell>
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={(checked) =>
                                                        handleSelectRow(
                                                            rowId,
                                                            checked as boolean
                                                        )
                                                    }
                                                />
                                            </TableCell>
                                        )}
                                        {columns.map((column) => (
                                            <TableCell key={column.key}>
                                                {column.cell
                                                    ? column.cell(row)
                                                    : (row[column.key] as React.ReactNode)}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {pagination && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Rows per page:</span>
                        <Select
                            value={String(pagination.pageSize)}
                            onValueChange={(value) =>
                                onPageSizeChange?.(Number(value))
                            }
                        >
                            <SelectTrigger className="w-[70px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[10, 20, 50, 100].map((size) => (
                                    <SelectItem key={size} value={String(size)}>
                                        {size}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <span>
                            {(pagination.page - 1) * pagination.pageSize + 1}-
                            {Math.min(
                                pagination.page * pagination.pageSize,
                                pagination.total
                            )}{" "}
                            of {pagination.total}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onPageChange?.(1)}
                            disabled={pagination.page <= 1}
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onPageChange?.(pagination.page - 1)}
                            disabled={pagination.page <= 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">
                            Page {pagination.page} of {pagination.totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onPageChange?.(pagination.page + 1)}
                            disabled={pagination.page >= pagination.totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onPageChange?.(pagination.totalPages)}
                            disabled={pagination.page >= pagination.totalPages}
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
