"use client"

import { type LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatsCardProps {
    title: string
    value: string | number
    change?: number
    icon: LucideIcon
    trend?: "up" | "down" | "neutral"
    description?: string
}

export function StatsCard({
    title,
    value,
    change,
    icon: Icon,
    trend = "neutral",
    description,
}: StatsCardProps) {
    const trendColors = {
        up: "text-green-500",
        down: "text-red-500",
        neutral: "text-muted-foreground",
    }

    const trendArrows = {
        up: "↑",
        down: "↓",
        neutral: "",
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {typeof value === "number" ? value.toLocaleString() : value}
                </div>
                <div className="flex items-center gap-1">
                    {change !== undefined && (
                        <span className={cn("text-xs", trendColors[trend])}>
                            {trendArrows[trend]} {Math.abs(change)}%
                        </span>
                    )}
                    {description && (
                        <p className="text-xs text-muted-foreground">
                            {description}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
