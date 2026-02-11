import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Layers } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"

export default async function CompoundsPage() {
    const session = await auth()
    if (!session) redirect("/login")

    const compounds = await prisma.compounds.findMany({
        orderBy: { period_start: 'desc' },
        take: 20
    })

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <PageHeader title="Memory Compounds" subtitle="Cross-referenced memory clusters linking related concepts and decisions." />
            </div>

            <div className="grid gap-4">
                {compounds.map((compound: any) => (
                    <Card key={Number(compound.id)} className="bg-zinc-900/50 border-zinc-800">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Layers className="h-5 w-5 text-purple-500" />
                                    <CardTitle className="text-white text-lg">
                                        {new Date(compound.period_start).toLocaleDateString()} - {new Date(compound.period_end).toLocaleDateString()}
                                    </CardTitle>
                                </div>
                                <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                                    {compound.agent_id || 'main'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="text-xs font-semibold text-zinc-500 mb-2">Summary</div>
                                <p className="text-sm text-zinc-300">{compound.summary}</p>
                            </div>
                            
                            {compound.key_learnings && compound.key_learnings.length > 0 && (
                                <div>
                                    <div className="text-xs font-semibold text-zinc-500 mb-2">Key Learnings</div>
                                    <ul className="space-y-1">
                                        {compound.key_learnings.map((learning: string, idx: number) => (
                                            <li key={idx} className="text-sm text-green-400 flex gap-2">
                                                <span>•</span>
                                                <span>{learning}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            
                            {compound.mistakes && compound.mistakes.length > 0 && (
                                <div>
                                    <div className="text-xs font-semibold text-zinc-500 mb-2">Mistakes</div>
                                    <ul className="space-y-1">
                                        {compound.mistakes.map((mistake: string, idx: number) => (
                                            <li key={idx} className="text-sm text-red-400 flex gap-2">
                                                <span>•</span>
                                                <span>{mistake}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
