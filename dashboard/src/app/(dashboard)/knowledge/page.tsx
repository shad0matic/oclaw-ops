import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { pool } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Network } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"

export default async function KnowledgePage() {
    const session = await auth()
    if (!session) redirect("/login")

    const entitiesResult = await pool.query("SELECT * FROM memory.entities ORDER BY created_at DESC LIMIT 50")
    const entities = entitiesResult.rows

    const entityTypes = Array.from(new Set(entities.map(e => e.entity_type)))

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <PageHeader title="Knowledge Graph" subtitle="Entities and relationships extracted from agent interactions and memory." />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {entities.map((entity: any) => (
                    <Card key={Number(entity.id)} className="bg-zinc-900/50 border-zinc-800">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Network className="h-4 w-4 text-blue-500" />
                                    <CardTitle className="text-white text-base">{entity.name}</CardTitle>
                                </div>
                                <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                                    {entity.entity_type}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {entity.aliases && entity.aliases.length > 0 && (
                                <div>
                                    <div className="text-xs font-semibold text-zinc-500 mb-1">Aliases</div>
                                    <div className="flex flex-wrap gap-1">
                                        {entity.aliases.map((alias: string) => (
                                            <span key={alias} className="text-xs bg-zinc-950 px-2 py-0.5 rounded text-zinc-400">
                                                {alias}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="text-xs text-zinc-500">
                                {entity.first_seen_by && (
                                    <span>Seen by {entity.first_seen_by} • </span>
                                )}
                                {entity.created_at?.toLocaleDateString()}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
