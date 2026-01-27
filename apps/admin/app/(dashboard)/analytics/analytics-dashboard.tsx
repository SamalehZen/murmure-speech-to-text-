"use client"

import * as React from "react"
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { StatsCard } from "@/components/stats-card"
import { Activity, DollarSign, Hash, Zap } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface AnalyticsData {
    period: string
    dailyRequests: Array<{ date: string; requests: number }>
    totalRequests: number
    usageByProvider: Array<{
        name: string
        value: number
        tokens: number
        cost: number
    }>
    usersByPlan: Array<{ name: string; value: number; color: string }>
    totalTokens: number
    totalCost: number
    recentTranscriptions: Array<{
        id: string
        text: string
        language: string
        duration: number
        wordCount: number
        createdAt: string
        user: { email: string; name: string | null }
    }>
}

const PROVIDER_COLORS: Record<string, string> = {
    OPENAI: "#10a37f",
    ANTHROPIC: "#d97706",
    GOOGLE: "#4285f4",
}

export function AnalyticsDashboard() {
    const [period, setPeriod] = React.useState("7d")
    const [data, setData] = React.useState<AnalyticsData | null>(null)
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            const response = await fetch(`/api/analytics?period=${period}`)
            const result = await response.json()
            setData(result)
            setLoading(false)
        }
        fetchData()
    }, [period])

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        })
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-[180px]" />
                <div className="grid gap-4 md:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-[120px]" />
                    ))}
                </div>
                <Skeleton className="h-[350px]" />
            </div>
        )
    }

    if (!data) return null

    const chartData = data.dailyRequests.map((d) => ({
        ...d,
        date: formatDate(d.date),
    }))

    const avgPerDay = Math.round(data.totalRequests / data.dailyRequests.length)
    const avgTokensPerRequest =
        data.totalRequests > 0
            ? Math.round(data.totalTokens / data.totalRequests)
            : 0

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                        <SelectItem value="90d">Last 90 days</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <StatsCard
                    title="Total Requests"
                    value={data.totalRequests.toLocaleString()}
                    icon={Activity}
                    description={`~${avgPerDay}/day`}
                />
                <StatsCard
                    title="Total Tokens"
                    value={data.totalTokens.toLocaleString()}
                    icon={Zap}
                    description={`~${avgTokensPerRequest}/req`}
                />
                <StatsCard
                    title="Total Cost"
                    value={`€${data.totalCost.toFixed(2)}`}
                    icon={DollarSign}
                    description="API costs"
                />
                <StatsCard
                    title="Avg Tokens/Request"
                    value={avgTokensPerRequest.toLocaleString()}
                    icon={Hash}
                    description="efficiency"
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Daily Requests</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart
                            data={chartData}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient
                                    id="colorRequests"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="5%"
                                        stopColor="hsl(var(--primary))"
                                        stopOpacity={0.8}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor="hsl(var(--primary))"
                                        stopOpacity={0}
                                    />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="date"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <CartesianGrid
                                strokeDasharray="3 3"
                                className="stroke-muted"
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "hsl(var(--card))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "8px",
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="requests"
                                stroke="hsl(var(--primary))"
                                fillOpacity={1}
                                fill="url(#colorRequests)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Usage by Provider</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.usageByProvider.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">
                                No provider data yet
                            </p>
                        ) : (
                            <>
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie
                                            data={data.usageByProvider}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {data.usageByProvider.map(
                                                (entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={
                                                            PROVIDER_COLORS[
                                                                entry.name
                                                            ] || "#888888"
                                                        }
                                                    />
                                                )
                                            )}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor:
                                                    "hsl(var(--card))",
                                                border: "1px solid hsl(var(--border))",
                                                borderRadius: "8px",
                                            }}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="mt-4 space-y-2">
                                    {data.usageByProvider.map((provider) => (
                                        <div
                                            key={provider.name}
                                            className="flex items-center justify-between text-sm"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="h-3 w-3 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            PROVIDER_COLORS[
                                                                provider.name
                                                            ] || "#888888",
                                                    }}
                                                />
                                                <span>{provider.name}</span>
                                            </div>
                                            <div className="text-muted-foreground">
                                                {provider.tokens.toLocaleString()}{" "}
                                                tokens • €
                                                {provider.cost.toFixed(2)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Users by Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.usersByPlan.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">
                                No user data yet
                            </p>
                        ) : (
                            <>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={data.usersByPlan}>
                                        <XAxis
                                            dataKey="name"
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor:
                                                    "hsl(var(--card))",
                                                border: "1px solid hsl(var(--border))",
                                                borderRadius: "8px",
                                            }}
                                        />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                            {data.usersByPlan.map(
                                                (entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={entry.color}
                                                    />
                                                )
                                            )}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                                    {data.usersByPlan.map((plan) => (
                                        <div key={plan.name}>
                                            <p className="text-2xl font-bold">
                                                {plan.value}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {plan.name}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {data.recentTranscriptions.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Transcriptions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data.recentTranscriptions.map((transcription) => (
                                <div
                                    key={transcription.id}
                                    className="flex items-start justify-between rounded-lg border p-4"
                                >
                                    <div className="space-y-1">
                                        <p className="text-sm line-clamp-2">
                                            {transcription.text}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {transcription.user.name ||
                                                transcription.user.email}{" "}
                                            • {transcription.language} •{" "}
                                            {transcription.wordCount} words •{" "}
                                            {transcription.duration}s
                                        </p>
                                    </div>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                                        {new Date(
                                            transcription.createdAt
                                        ).toLocaleDateString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
