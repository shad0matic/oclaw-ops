import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, TrendingUp } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"

export default async function CostsPage() {
    const session = await auth()
    if (!session) redirect("/login")

    const [subscriptions, recentSnapshots] = await Promise.all([
        prisma.subscriptions.findMany({
            where: { active: true },
            orderBy: { monthly_price: 'desc' }
        }),
        prisma.cost_snapshots.findMany({
            orderBy: { snapshot_hour: 'desc' },
            take: 30
        })
    ])

    const totalMonthlyFixed = subscriptions.reduce(
        (sum, sub) => sum + Number(sub.monthly_price),
        0
    )

    const latestSnapshot = recentSnapshots[0]

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <PageHeader title="Cost Tracking" subtitle="API usage costs across providers — daily snapshots and spending trends." />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Monthly Fixed
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">
                            €{totalMonthlyFixed.toFixed(2)}
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">
                            {subscriptions.length} active subscriptions
                        </p>
                    </CardContent>
                </Card>

                {latestSnapshot && (
                    <>
                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" />
                                    Latest Variable
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-white">
                                    €{Number(latestSnapshot.variable_eur).toFixed(2)}
                                </div>
                                <p className="text-xs text-zinc-500 mt-1">
                                    Hourly snapshot
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-400">
                                    Total (Latest Hour)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-white">
                                    €{Number(latestSnapshot.total_eur).toFixed(2)}
                                </div>
                                <p className="text-xs text-zinc-500 mt-1">
                                    Fixed + Variable
                                </p>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                    <CardTitle>Active Subscriptions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {subscriptions.map((sub) => (
                            <div
                                key={sub.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/50 border border-zinc-800"
                            >
                                <div>
                                    <div className="font-medium text-white">{sub.name}</div>
                                    {sub.provider && (
                                        <div className="text-xs text-zinc-500">{sub.provider}</div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="font-mono text-white">
                                        €{Number(sub.monthly_price).toFixed(2)}
                                    </div>
                                    <div className="text-xs text-zinc-500">/month</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
