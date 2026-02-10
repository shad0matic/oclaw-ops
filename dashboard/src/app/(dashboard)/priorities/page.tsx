import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle } from "lucide-react"

export default async function PrioritiesPage() {
    const session = await auth()
    if (!session) redirect("/login")

    const priorities = await prisma.priorities.findMany({
        where: { resolved_at: null },
        orderBy: [
            { priority: 'asc' },
            { created_at: 'desc' }
        ],
        include: {
            cross_signals: {
                take: 3
            }
        }
    })

    const getPriorityColor = (p: number) => {
        if (p <= 2) return "text-red-500 bg-red-500/10 border-red-500/20"
        if (p <= 4) return "text-amber-500 bg-amber-500/10 border-amber-500/20"
        return "text-zinc-500 bg-zinc-500/10 border-zinc-500/20"
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight text-white">Priorities</h2>
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
