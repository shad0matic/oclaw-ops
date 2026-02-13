import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { pool } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"

export default async function PrioritiesPage() {
    const session = await auth()
    if (!session) redirect("/login")

    const prioritiesResult = await pool.query(`
        SELECT * 
        FROM ops.priorities 
        WHERE resolved_at IS NULL 
        ORDER BY priority ASC, created_at DESC
    `)
    const priorities = prioritiesResult.rows

    const getPriorityColor = (p: number) => {
        if (p <= 2) return "text-red-500 bg-red-500/10 border-red-500/20"
        if (p <= 4) return "text-amber-500 bg-amber-500/10 border-amber-500/20"
        return "text-zinc-500 bg-zinc-500/10 border-zinc-500/20"
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <PageHeader title="Priorities" subtitle="Ranked priorities and focus areas guiding agent decision-making." />
            </div>

            <div className="grid gap-4">
                {priorities.map((priority: any) => (
                    <Card key={Number(priority.id)} className="bg-zinc-900/50 border-zinc-800">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                    <CardTitle className="text-white">{priority.entity}</CardTitle>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={getPriorityColor(priority.priority || 5)}>
                                        P{priority.priority}
                                    </Badge>
                                    <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                                        {priority.entity_type}
                                    </Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {priority.context && (
                                <p className="text-sm text-zinc-300">{priority.context}</p>
                            )}
                            <div className="flex items-center justify-between text-xs text-zinc-500">
                                <div>
                                    Reported by {priority.reported_by} • {priority.signal_count || 0} signals
                                </div>
                                <div>
                                    {priority.created_at?.toLocaleDateString()}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
