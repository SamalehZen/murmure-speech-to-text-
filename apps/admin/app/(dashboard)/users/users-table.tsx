"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
    Download,
    MoreHorizontal,
    ShieldBan,
    ShieldCheck,
    UserCog,
    UserPlus,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTable } from "@/components/data-table"
import { Progress } from "@/components/ui/progress"
import { UserDetailDialog } from "./user-detail-dialog"
import { useToast } from "@/hooks/use-toast"

interface User {
    id: string
    email: string
    name: string | null
    image: string | null
    status: string
    role: string
    plan: string
    createdAt: string
    lastLoginAt: string | null
    _count: {
        transcriptions: number
        usageLogs: number
    }
}

interface UsersResponse {
    items: User[]
    total: number
    page: number
    pageSize: number
    totalPages: number
}

const PLAN_LIMITS: Record<string, number> = {
    FREE: 50,
    PRO: 500,
    BUSINESS: -1,
}

const statusColors: Record<string, string> = {
    ACTIVE: "bg-green-500/10 text-green-500",
    SUSPENDED: "bg-yellow-500/10 text-yellow-500",
    BLOCKED: "bg-red-500/10 text-red-500",
}

const planColors: Record<string, string> = {
    FREE: "bg-gray-500/10 text-gray-500",
    PRO: "bg-blue-500/10 text-blue-500",
    BUSINESS: "bg-purple-500/10 text-purple-500",
}

export function UsersTable() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { toast } = useToast()

    const [data, setData] = React.useState<UsersResponse | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [selectedIds, setSelectedIds] = React.useState<string[]>([])
    const [selectedUser, setSelectedUser] = React.useState<User | null>(null)
    const [dialogOpen, setDialogOpen] = React.useState(false)

    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")
    const status = searchParams.get("status")
    const plan = searchParams.get("plan")
    const search = searchParams.get("search")

    const fetchUsers = React.useCallback(async () => {
        setLoading(true)
        const params = new URLSearchParams()
        params.set("page", String(page))
        params.set("pageSize", String(pageSize))
        if (status) params.set("status", status)
        if (plan) params.set("plan", plan)
        if (search) params.set("search", search)

        const response = await fetch(`/api/users?${params.toString()}`)
        const result = await response.json()
        setData(result)
        setLoading(false)
    }, [page, pageSize, status, plan, search])

    React.useEffect(() => {
        fetchUsers()
    }, [fetchUsers])

    const updateParams = (updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString())
        Object.entries(updates).forEach(([key, value]) => {
            if (value === null) {
                params.delete(key)
            } else {
                params.set(key, value)
            }
        })
        router.push(`/users?${params.toString()}`)
    }

    const handleStatusChange = async (userId: string, newStatus: string) => {
        const response = await fetch(`/api/users/${userId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
        })

        if (response.ok) {
            toast({
                title: "User updated",
                description: `User status changed to ${newStatus}`,
                variant: "success",
            })
            fetchUsers()
        } else {
            const error = await response.json()
            toast({
                title: "Error",
                description: error.error || "Failed to update user",
                variant: "destructive",
            })
        }
    }

    const handleBulkAction = async (action: "status" | "plan", value: string) => {
        if (selectedIds.length === 0) return

        const response = await fetch("/api/users/bulk", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userIds: selectedIds,
                [action]: value,
            }),
        })

        if (response.ok) {
            const result = await response.json()
            toast({
                title: "Bulk update complete",
                description: `Updated ${result.updatedCount} users`,
                variant: "success",
            })
            setSelectedIds([])
            fetchUsers()
        } else {
            toast({
                title: "Error",
                description: "Failed to update users",
                variant: "destructive",
            })
        }
    }

    const handleExport = () => {
        const params = new URLSearchParams()
        if (selectedIds.length > 0) {
            params.set("ids", selectedIds.join(","))
        } else {
            if (status) params.set("status", status)
            if (plan) params.set("plan", plan)
        }
        window.open(`/api/users/export?${params.toString()}`, "_blank")
    }

    const getInitials = (name: string | null) => {
        if (!name) return "U"
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
    }

    const getRpdColor = (percentage: number) => {
        if (percentage < 70) return "bg-green-500"
        if (percentage < 90) return "bg-yellow-500"
        return "bg-red-500"
    }

    const columns = [
        {
            key: "user",
            header: "User",
            cell: (row: User) => (
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={row.image || undefined} />
                        <AvatarFallback>{getInitials(row.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-medium">{row.name || "Unnamed"}</p>
                        <p className="text-sm text-muted-foreground">
                            {row.email}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            key: "plan",
            header: "Plan",
            cell: (row: User) => (
                <Badge className={planColors[row.plan]} variant="secondary">
                    {row.plan}
                </Badge>
            ),
        },
        {
            key: "status",
            header: "Status",
            cell: (row: User) => (
                <Badge className={statusColors[row.status]} variant="secondary">
                    {row.status}
                </Badge>
            ),
        },
        {
            key: "rpd",
            header: "RPD",
            cell: (row: User) => {
                const limit = PLAN_LIMITS[row.plan]
                if (row.status !== "ACTIVE") {
                    return <span className="text-muted-foreground">--</span>
                }
                if (limit === -1) {
                    return <span className="text-muted-foreground">∞</span>
                }
                const usage = Math.floor(Math.random() * limit)
                const percentage = (usage / limit) * 100
                return (
                    <div className="flex items-center gap-2 min-w-[100px]">
                        <Progress
                            value={percentage}
                            className="h-2"
                            indicatorClassName={getRpdColor(percentage)}
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {usage}/{limit}
                        </span>
                    </div>
                )
            },
        },
        {
            key: "activity",
            header: "Activity",
            cell: (row: User) => (
                <div className="text-sm">
                    <p>{row._count.transcriptions} transcriptions</p>
                    <p className="text-muted-foreground">
                        {row._count.usageLogs} requests
                    </p>
                </div>
            ),
        },
        {
            key: "actions",
            header: "",
            cell: (row: User) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={() => {
                                setSelectedUser(row)
                                setDialogOpen(true)
                            }}
                        >
                            <UserCog className="mr-2 h-4 w-4" />
                            View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {row.status === "ACTIVE" && (
                            <>
                                <DropdownMenuItem
                                    onClick={() =>
                                        handleStatusChange(row.id, "SUSPENDED")
                                    }
                                >
                                    <ShieldBan className="mr-2 h-4 w-4 text-yellow-500" />
                                    Suspend User
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() =>
                                        handleStatusChange(row.id, "BLOCKED")
                                    }
                                    className="text-red-500"
                                >
                                    <ShieldBan className="mr-2 h-4 w-4" />
                                    Block User
                                </DropdownMenuItem>
                            </>
                        )}
                        {row.status === "SUSPENDED" && (
                            <>
                                <DropdownMenuItem
                                    onClick={() =>
                                        handleStatusChange(row.id, "ACTIVE")
                                    }
                                >
                                    <ShieldCheck className="mr-2 h-4 w-4 text-green-500" />
                                    Reactivate
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() =>
                                        handleStatusChange(row.id, "BLOCKED")
                                    }
                                    className="text-red-500"
                                >
                                    <ShieldBan className="mr-2 h-4 w-4" />
                                    Block User
                                </DropdownMenuItem>
                            </>
                        )}
                        {row.status === "BLOCKED" && (
                            <DropdownMenuItem
                                onClick={() =>
                                    handleStatusChange(row.id, "ACTIVE")
                                }
                            >
                                <ShieldCheck className="mr-2 h-4 w-4 text-green-500" />
                                Unblock User
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ]

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {selectedIds.length > 0 && (
                        <>
                            <span className="text-sm text-muted-foreground">
                                {selectedIds.length} selected
                            </span>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        Bulk Actions
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuLabel>
                                        Change Status
                                    </DropdownMenuLabel>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            handleBulkAction("status", "ACTIVE")
                                        }
                                    >
                                        Set Active
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            handleBulkAction(
                                                "status",
                                                "SUSPENDED"
                                            )
                                        }
                                    >
                                        Set Suspended
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            handleBulkAction("status", "BLOCKED")
                                        }
                                    >
                                        Set Blocked
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel>
                                        Change Plan
                                    </DropdownMenuLabel>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            handleBulkAction("plan", "FREE")
                                        }
                                    >
                                        Set Free
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            handleBulkAction("plan", "PRO")
                                        }
                                    >
                                        Set Pro
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            handleBulkAction("plan", "BUSINESS")
                                        }
                                    >
                                        Set Business
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                    <Button size="sm">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add User
                    </Button>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={data?.items || []}
                loading={loading}
                searchKey="email"
                searchPlaceholder="Search users..."
                onSearchChange={(value) =>
                    updateParams({ search: value || null, page: "1" })
                }
                filters={[
                    {
                        key: "status",
                        label: "Status",
                        options: [
                            { value: "ACTIVE", label: "Active" },
                            { value: "SUSPENDED", label: "Suspended" },
                            { value: "BLOCKED", label: "Blocked" },
                        ],
                    },
                    {
                        key: "plan",
                        label: "Plan",
                        options: [
                            { value: "FREE", label: "Free" },
                            { value: "PRO", label: "Pro" },
                            { value: "BUSINESS", label: "Business" },
                        ],
                    },
                ]}
                filterValues={{ status, plan }}
                onFilterChange={(key, value) =>
                    updateParams({ [key]: value, page: "1" })
                }
                pagination={
                    data
                        ? {
                              page: data.page,
                              pageSize: data.pageSize,
                              total: data.total,
                              totalPages: data.totalPages,
                          }
                        : undefined
                }
                onPageChange={(p) => updateParams({ page: String(p) })}
                onPageSizeChange={(size) =>
                    updateParams({ pageSize: String(size), page: "1" })
                }
                selectable
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                getRowId={(row) => row.id}
            />

            <UserDetailDialog
                user={selectedUser}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onUpdate={() => {
                    fetchUsers()
                    setDialogOpen(false)
                }}
            />
        </div>
    )
}
