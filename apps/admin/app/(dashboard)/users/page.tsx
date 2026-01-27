import { prisma } from "@murmure/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

async function getUsers() {
    return prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
            subscription: true,
            _count: {
                select: { transcriptions: true, usageLogs: true },
            },
        },
    })
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

export default async function UsersPage() {
    const users = await getUsers()

    const getInitials = (name: string | null) => {
        if (!name) return "U"
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Users</h1>
                <p className="text-muted-foreground">
                    Manage and view all registered users
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Users ({users.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {users.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">
                                No users found
                            </p>
                        ) : (
                            users.map((user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between rounded-lg border p-4"
                                >
                                    <div className="flex items-center gap-4">
                                        <Avatar>
                                            <AvatarImage
                                                src={user.image || undefined}
                                            />
                                            <AvatarFallback>
                                                {getInitials(user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">
                                                {user.name || "Unnamed User"}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {user.email}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right text-sm">
                                            <p>
                                                {user._count.transcriptions}{" "}
                                                transcriptions
                                            </p>
                                            <p className="text-muted-foreground">
                                                Joined{" "}
                                                {new Date(
                                                    user.createdAt
                                                ).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <Badge
                                            className={planColors[user.plan]}
                                            variant="secondary"
                                        >
                                            {user.plan}
                                        </Badge>
                                        <Badge
                                            className={statusColors[user.status]}
                                            variant="secondary"
                                        >
                                            {user.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
