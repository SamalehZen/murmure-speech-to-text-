"use client"

import { SessionProvider } from "next-auth/react"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <TooltipProvider>
                {children}
                <Toaster />
            </TooltipProvider>
        </SessionProvider>
    )
}
