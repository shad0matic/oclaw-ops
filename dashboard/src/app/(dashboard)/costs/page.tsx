
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, TrendingUp } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { CostLearningDashboard } from "@/components/costs/cost-learning-dashboard"
import { Suspense } from "react"

async function getCostLearningData(days = 30) {
    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - days);

    const [dailyData, accuracyData, costByTier, totalTasks, totalCost, avgAccuracy, distinctTaskTypes, distinctModels] = await Promise.all([
        prisma.$queryRaw`
            SELECT DATE(created_at) AS date, SUM(estimated_cost_usd) AS "estimatedCost", SUM(cost_usd) AS "actualCost"
            FROM ops.task_runs
            WHERE created_at >= ${dateFilter}
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at) ASC
        `,
        prisma.$queryRaw`
            SELECT DATE(tr.created_at) AS date, AVG(ce.accuracy_pct) AS "averageAccuracy"
            FROM ops.task_runs tr
            JOIN ops.cost_estimates ce ON tr.id = ce.task_run_id
            WHERE tr.created_at >= ${dateFilter}
            GROUP BY DATE(tr.created_at)
            ORDER BY DATE(tr.created_at) ASC
        `,
        prisma.$queryRaw`
            SELECT DATE(created_at) AS date, tier, SUM(cost_usd) AS "totalCost"
            FROM ops.task_runs
            WHERE created_at >= ${dateFilter}
            GROUP BY DATE(created_at), tier
            ORDER BY DATE(created_at) ASC, tier ASC
        `,
        prisma.task_runs.count({ where: { created_at: { gte: dateFilter } } }),
        prisma.task_runs.aggregate({
            _sum: { cost_usd: true },
            where: { created_at: { gte: dateFilter } }
        }),
        prisma.cost_estimates.aggregate({
            _avg: { accuracy_pct: true },
            where: { created_at: { gte: dateFilter } }
        }),
        prisma.task_runs.findMany({
            select: { task_type: true },
            distinct: ['task_type'],
            where: { task_type: { not: null } }
        }),
        prisma.task_runs.findMany({
            select: { model_alias: true },
            distinct: ['model_alias'],
            where: { model_alias: { not: null } }
        })
    ]);

    // TODO: This needs a proper calculation based on a reference model price
    const estimatedSavings = 0;

    return {
        // @ts-ignore
        dailyData: (dailyData as any[]).map(d => ({ ...d, date: d.date.toISOString(), estimatedCost: Number(d.estimatedCost ?? 0), actualCost: Number(d.actualCost ?? 0) })),
        // @ts-ignore
        accuracyData: (accuracyData as any[]).map(d => ({ ...d, date: d.date.toISOString(), averageAccuracy: Number(d.averageAccuracy ?? 0) })),
        // @ts-ignore
        costByTier: (costByTier as any[]).map(d => ({ ...d, date: d.date.toISOString(), totalCost: Number(d.totalCost) })),
        summaryStats: {
            totalTasks,
            totalCost: Number(totalCost._sum.cost_usd ?? 0),
            averageAccuracy: Number(avgAccuracy._avg.accuracy_pct ?? 0),
            estimatedSavings,
        },
        filters: {
            taskTypes: distinctTaskTypes.map(t => t.task_type),
            models: distinctModels.map(m => m.model_alias),
        }
    };
}


export default async function CostsPage() {
    const session = await auth()
    if (!session) redirect("/login")

    const [subscriptions, recentSnapshots, initialLearningData] = await Promise.all([
        prisma.subscriptions.findMany({
            where: { active: true },
            orderBy: { monthly_price: 'desc' }
        }),
        prisma.cost_snapshots.findMany({
            orderBy: { snapshot_hour: 'desc' },
            take: 30
        }),
        getCostLearningData()
    ])

    const totalMonthlyFixed = subscriptions.reduce(
        (sum, sub) => sum + Number(sub.monthly_price),
        0
    )

    const latestSnapshot = recentSnapshots[0]

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <PageHeader title="Cost Tracking" subtitle="Subscriptions, API usage, and cost analysis." />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Monthly Fixed
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            €{totalMonthlyFixed.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {subscriptions.length} active subscriptions
                        </p>
                    </CardContent>
                </Card>

                {latestSnapshot && (
                    <>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" />
                                    Latest Variable
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">
                                    €{Number(latestSnapshot.variable_eur).toFixed(2)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Hourly snapshot
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Total (Latest Hour)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">
                                    €{Number(latestSnapshot.total_eur).toFixed(2)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Fixed + Variable
                                </p>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            <Suspense fallback={<div>Loading dashboard...</div>}>
                <CostLearningDashboard initialData={initialLearningData} />
            </Suspense>

            <Card>
                <CardHeader>
                    <CardTitle>Active Subscriptions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {subscriptions.map((sub) => (
                            <div
                                key={sub.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-secondary"
                            >
                                <div>
                                    <div className="font-medium">{sub.name}</div>
                                    {sub.provider && (
                                        <div className="text-xs text-muted-foreground">{sub.provider}</div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="font-mono">
                                        €{Number(sub.monthly_price).toFixed(2)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">/month</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

        </div>
    )
}

