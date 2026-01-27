import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { AnalyticsDashboard } from "./analytics-dashboard"

export default function AnalyticsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Analytics</h1>
                <p className="text-muted-foreground">
                    Usage statistics and insights
                </p>
            </div>

            <Suspense fallback={<AnalyticsSkeleton />}>
                <AnalyticsDashboard />
            </Suspense>
        </div>
    )
}

function AnalyticsSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex gap-4">
                <Skeleton className="h-10 w-[180px]" />
            </div>
            <Skeleton className="h-[350px] w-full" />
            <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-[300px] w-full" />
                <Skeleton className="h-[300px] w-full" />
            </div>
        </div>
    )
}
