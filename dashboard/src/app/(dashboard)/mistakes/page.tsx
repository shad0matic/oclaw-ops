import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"

export default async function MistakesPage() {
    const session = await auth()
    if (!session) redirect("/login")

    const mistakes = await prisma.mistakes.findMany({
        where: { resolved: false },
        orderBy: [
            { severity: 'desc' },
            { last_occurred_at: 'desc' }
        ],
        take: 50
    })

    const getSeverityColor = (s: number) => {
        if (s >= 4) return "text-red-500 bg-red-500/10 border-red-500/20"
        if (s >= 3) return "text-amber-500 bg-amber-500/10 border-amber-500/20"
        return "text-blue-500 bg-blue-500/10 border-blue-500/20"
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <PageHeader title="Mistakes Log" subtitle="Documented errors and lessons learned — helping agents avoid repeating failures." />
            </div>

            <div className="grid gap-4">
                {mistakes.map((mistake: any) => (
                    <Card key={Number(mistake.id)} className="bg-zinc-900/50 border-zinc-800">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                    <CardTitle className="text-white text-lg">{mistake.description}</CardTitle>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={getSeverityColor(mistake.severity || 3)}>
                                        Severity {mistake.severity}
                                    </Badge>
                                    <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                                        {mistake.agent_id}
                                    </Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {mistake.context && (
                                <div>
                                    <div className="text-xs font-semibold text-zinc-500 mb-1">Context</div>
                                    <p className="text-sm text-zinc-300">{mistake.context}</p>
                                </div>
                            )}
                            {mistake.lesson_learned && (
                                <div>
                                    <div className="text-xs font-semibold text-zinc-500 mb-1">Lesson Learned</div>
                                    <p className="text-sm text-green-400">{mistake.lesson_learned}</p>
                                </div>
                            )}
                            <div className="flex items-center justify-between text-xs text-zinc-500">
                                <div>
                                    Recurred {mistake.recurrence_count || 1} time(s)
                                </div>
                                <div>
                                    Last: {mistake.last_occurred_at?.toLocaleDateString()}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
