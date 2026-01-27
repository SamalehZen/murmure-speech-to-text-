"use client"

import {
    Bar,
    BarChart,
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

interface BillingChartsProps {
    revenueByPlan: Array<{ name: string; value: number; users: number }>
}

const PLAN_COLORS = {
    Pro: "#3b82f6",
    Business: "#8b5cf6",
}

export function BillingCharts({ revenueByPlan }: BillingChartsProps) {
    const totalRevenue = revenueByPlan.reduce((sum, p) => sum + p.value, 0)

    return (
        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Revenue by Plan</CardTitle>
                </CardHeader>
                <CardContent>
                    {totalRevenue === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                            No revenue data yet
                        </p>
                    ) : (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={revenueByPlan}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) =>
                                        `${name} ${(percent * 100).toFixed(0)}%`
                                    }
                                >
                                    {revenueByPlan.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={
                                                PLAN_COLORS[
                                                    entry.name as keyof typeof PLAN_COLORS
                                                ] || "#888888"
                                            }
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) =>
                                        `€${value.toFixed(2)}`
                                    }
                                    contentStyle={{
                                        backgroundColor: "hsl(var(--card))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "8px",
                                    }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Paid Users Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                    {revenueByPlan.every((p) => p.users === 0) ? (
                        <p className="text-center text-muted-foreground py-8">
                            No paid users yet
                        </p>
                    ) : (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={revenueByPlan}>
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
                                        backgroundColor: "hsl(var(--card))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "8px",
                                    }}
                                />
                                <Bar dataKey="users" name="Users" radius={[4, 4, 0, 0]}>
                                    {revenueByPlan.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={
                                                PLAN_COLORS[
                                                    entry.name as keyof typeof PLAN_COLORS
                                                ] || "#888888"
                                            }
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
