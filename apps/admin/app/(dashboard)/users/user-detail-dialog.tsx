"use client"

import * as React from "react"
import { format, formatDistanceToNow } from "date-fns"
import { Mail, ShieldBan, ShieldCheck, ShieldX } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
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

interface UserDetail extends User {
    usage?: {
        todayRequests: number
        dailyLimit: number
        usagePercentage: number
        monthlyRequests: number
        monthlyTokens: number
        monthlyCost: number
    }
    recentTranscriptions?: Array<{
        id: string
        text: string
        createdAt: string
        duration: number
        wordCount: number
    }>
}

interface UserDetailDialogProps {
    user: User | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onUpdate: () => void
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

export function UserDetailDialog({
    user,
    open,
    onOpenChange,
    onUpdate,
}: UserDetailDialogProps) {
    const { toast } = useToast()
    const [loading, setLoading] = React.useState(false)
    const [userDetail, setUserDetail] = React.useState<UserDetail | null>(null)
    const [selectedStatus, setSelectedStatus] = React.useState<string>("")
    const [selectedPlan, setSelectedPlan] = React.useState<string>("")

    React.useEffect(() => {
        if (user && open) {
            setSelectedStatus(user.status)
            setSelectedPlan(user.plan)
            fetchUserDetail(user.id)
        }
    }, [user, open])

    const fetchUserDetail = async (userId: string) => {
        setLoading(true)
        const response = await fetch(`/api/users/${userId}`)
        if (response.ok) {
            const data = await response.json()
            setUserDetail(data)
        }
        setLoading(false)
    }

    const handleSave = async () => {
        if (!user) return

        const updates: Record<string, string> = {}
        if (selectedStatus !== user.status) updates.status = selectedStatus
        if (selectedPlan !== user.plan) updates.plan = selectedPlan

        if (Object.keys(updates).length === 0) {
            onOpenChange(false)
            return
        }

        const response = await fetch(`/api/users/${user.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
        })

        if (response.ok) {
            toast({
                title: "User updated",
                description: "User details have been saved",
                variant: "success",
            })
            onUpdate()
        } else {
            const error = await response.json()
            toast({
                title: "Error",
                description: error.error || "Failed to update user",
                variant: "destructive",
            })
        }
    }

    const handleStatusAction = async (newStatus: string) => {
        if (!user) return

        const response = await fetch(`/api/users/${user.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                status: newStatus,
                note: newStatus === "ACTIVE" ? "Unblocked by admin" : undefined,
            }),
        })

        if (response.ok) {
            toast({
                title: "User updated",
                description: `User ${newStatus.toLowerCase()}`,
                variant: "success",
            })
            onUpdate()
        } else {
            const error = await response.json()
            toast({
                title: "Error",
                description: error.error || "Failed to update user",
                variant: "destructive",
            })
        }
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

    if (!user) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={user.image || undefined} />
                            <AvatarFallback className="text-xl">
                                {getInitials(user.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <DialogTitle className="text-xl">
                                {user.name || "Unnamed User"}
                            </DialogTitle>
                            <DialogDescription>{user.email}</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <Select
                                value={selectedStatus}
                                onValueChange={setSelectedStatus}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ACTIVE">
                                        <span className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-green-500" />
                                            Active
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="SUSPENDED">
                                        <span className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-yellow-500" />
                                            Suspended
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="BLOCKED">
                                        <span className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-red-500" />
                                            Blocked
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Plan</label>
                            <Select
                                value={selectedPlan}
                                onValueChange={setSelectedPlan}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="FREE">Free</SelectItem>
                                    <SelectItem value="PRO">Pro</SelectItem>
                                    <SelectItem value="BUSINESS">
                                        Business
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-muted-foreground">Joined:</span>
                            <span className="ml-2 font-medium">
                                {format(new Date(user.createdAt), "MMM d, yyyy")}
                            </span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">
                                Last login:
                            </span>
                            <span className="ml-2 font-medium">
                                {user.lastLoginAt
                                    ? formatDistanceToNow(
                                          new Date(user.lastLoginAt),
                                          { addSuffix: true }
                                      )
                                    : "Never"}
                            </span>
                        </div>
                    </div>

                    <Separator />

                    {userDetail?.usage && (
                        <div className="space-y-4">
                            <h4 className="font-medium">Usage This Month</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            Requests Today
                                        </span>
                                        <span>
                                            {userDetail.usage.todayRequests}/
                                            {userDetail.usage.dailyLimit === -1
                                                ? "∞"
                                                : userDetail.usage.dailyLimit}
                                        </span>
                                    </div>
                                    {userDetail.usage.dailyLimit !== -1 && (
                                        <Progress
                                            value={
                                                userDetail.usage.usagePercentage
                                            }
                                            className="h-2"
                                            indicatorClassName={getRpdColor(
                                                userDetail.usage.usagePercentage
                                            )}
                                        />
                                    )}
                                </div>
                                <div className="text-sm">
                                    <span className="text-muted-foreground">
                                        Tokens used
                                    </span>
                                    <p className="font-medium">
                                        {userDetail.usage.monthlyTokens.toLocaleString()}
                                    </p>
                                </div>
                                <div className="text-sm">
                                    <span className="text-muted-foreground">
                                        Cost
                                    </span>
                                    <p className="font-medium">
                                        €{userDetail.usage.monthlyCost.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <Separator />

                    {userDetail?.recentTranscriptions &&
                        userDetail.recentTranscriptions.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="font-medium">
                                    Recent Transcriptions
                                </h4>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                    {userDetail.recentTranscriptions.map(
                                        (transcription) => (
                                            <div
                                                key={transcription.id}
                                                className="rounded-lg border p-3 text-sm"
                                            >
                                                <p className="line-clamp-2">
                                                    {transcription.text}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {formatDistanceToNow(
                                                        new Date(
                                                            transcription.createdAt
                                                        ),
                                                        { addSuffix: true }
                                                    )}{" "}
                                                    • {transcription.wordCount}{" "}
                                                    words •{" "}
                                                    {transcription.duration}s
                                                </p>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        )}
                </div>

                <DialogFooter className="flex-col gap-2 sm:flex-row">
                    <div className="flex gap-2 mr-auto">
                        {user.status === "ACTIVE" && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        handleStatusAction("SUSPENDED")
                                    }
                                >
                                    <ShieldBan className="mr-2 h-4 w-4 text-yellow-500" />
                                    Suspend
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-500 hover:text-red-500"
                                    onClick={() => handleStatusAction("BLOCKED")}
                                >
                                    <ShieldX className="mr-2 h-4 w-4" />
                                    Block
                                </Button>
                            </>
                        )}
                        {user.status !== "ACTIVE" && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusAction("ACTIVE")}
                            >
                                <ShieldCheck className="mr-2 h-4 w-4 text-green-500" />
                                Reactivate
                            </Button>
                        )}
                        <Button variant="outline" size="sm">
                            <Mail className="mr-2 h-4 w-4" />
                            Send Email
                        </Button>
                    </div>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
