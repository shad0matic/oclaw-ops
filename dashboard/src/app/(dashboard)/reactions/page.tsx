import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { pool } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Zap, ArrowRight } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"

export default async function ReactionsPage() {
    const session = await auth()
    if (!session) redirect("/login")

    const reactionsResult = await pool.query("SELECT * FROM ops.reactions ORDER BY created_at DESC")
    const reactions = reactionsResult.rows

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <PageHeader title="Reaction Matrix" subtitle="Learned response patterns — how agents should react to recurring situations." />
            </div>

            <div className="grid gap-4">
                {reactions.map((reaction) => (
                    <Card key={reaction.id} className="bg-zinc-900/50 border-zinc-800">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Zap className="h-5 w-5 text-amber-500" />
                                    <CardTitle className="text-white text-lg">
                                        {reaction.trigger_event}
                                    </CardTitle>
                                </div>
                                <Badge 
                                    variant="outline" 
                                    className={reaction.enabled 
                                        ? "bg-green-500/10 text-green-500 border-green-500/20"
                                        : "bg-zinc-800 text-zinc-500"
                                    }
                                >
                                    {reaction.enabled ? 'Enabled' : 'Disabled'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-zinc-500">Trigger:</span>
                                    <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                                        {reaction.trigger_agent}
                                    </Badge>
                                </div>
                                <ArrowRight className="h-4 w-4 text-zinc-600" />
                                <div className="flex items-center gap-2">
                                    <span className="text-zinc-500">Responder:</span>
                                    <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                                        {reaction.responder_agent}
                                    </Badge>
                                </div>
                                <ArrowRight className="h-4 w-4 text-zinc-600" />
                                <div className="flex items-center gap-2">
                                    <span className="text-zinc-500">Action:</span>
                                    <span className="text-amber-400 font-mono text-xs">{reaction.action}</span>
                                </div>
                            </div>
                            {reaction.probability && Number(reaction.probability) < 1 && (
                                <div className="mt-2 text-xs text-zinc-500">
                                    Probability: {(Number(reaction.probability) * 100).toFixed(0)}%
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
