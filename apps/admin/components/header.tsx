"use client"

import { useSession } from "next-auth/react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { signOut } from "next-auth/react"

export function Header() {
    const { data: session } = useSession()

    const getInitials = (name: string | null | undefined) => {
        if (!name) return "U"
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
    }

    return (
        <header className="flex h-16 items-center justify-between border-b bg-card px-6">
            <div />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-3 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                        <span className="text-sm font-medium">
                            {session?.user?.name || session?.user?.email}
                        </span>
                        <Avatar className="h-8 w-8">
                            <AvatarImage
                                src={session?.user?.image || undefined}
                            />
                            <AvatarFallback>
                                {getInitials(session?.user?.name)}
                            </AvatarFallback>
                        </Avatar>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium">
                                {session?.user?.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {session?.user?.email}
                            </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => signOut({ callbackUrl: "/login" })}
                    >
                        Sign out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
    )
}
