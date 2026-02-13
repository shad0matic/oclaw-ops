import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { pool } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Brain, Calendar, Database, TrendingUp, Tag } from "lucide-react"
import { MemorySearch } from "@/components/memory/memory-search"
import { MemoryCheck } from "@/components/memory/memory-check"
import { PageHeader } from "@/components/layout/page-header"

export default async function MemoryPage() {
    const session = await auth()
    if (!session) redirect("/login")

    const [memoriesResult, dailyNotesResult, totalMemoriesResult, totalNotesResult, avgImportanceResult, taggedCountResult] = await Promise.all([
        pool.query("SELECT * FROM memory.memories ORDER BY created_at DESC LIMIT 20"),
        pool.query("SELECT * FROM memory.daily_notes ORDER BY note_date DESC LIMIT 10"),
        pool.query("SELECT COUNT(*) FROM memory.memories"),
        pool.query("SELECT COUNT(*) FROM memory.daily_notes"),
        pool.query("SELECT AVG(importance) as avg_importance FROM memory.memories"),
        pool.query("SELECT COUNT(*) FROM memory.memories WHERE tags IS NOT NULL AND array_length(tags, 1) > 0")
    ])

    const memories = memoriesResult.rows
    const dailyNotes = dailyNotesResult.rows
    const totalMemories = Number(totalMemoriesResult.rows[0].count)
    const totalNotes = Number(totalNotesResult.rows[0].count)
    const avgImportance = Number(avgImportanceResult.rows[0].avg_importance)
    const taggedCount = Number(taggedCountResult.rows[0].count)

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <PageHeader title="Memory Bank" subtitle="Long-term memories stored by agents — searchable, tagged, and importance-ranked." />
            </div>

            <MemoryCheck />

            <Tabs defaultValue="search" className="space-y-4">
                <TabsList className="bg-zinc-900 border border-zinc-800">
                    <TabsTrigger value="search">Search</TabsTrigger>
                    <TabsTrigger value="memories">Memories</TabsTrigger>
                    <TabsTrigger value="daily">Daily Notes</TabsTrigger>
                    <TabsTrigger value="stats">Stats</TabsTrigger>
                </TabsList>

                <TabsContent value="search" className="space-y-4">
                    <MemorySearch />
                </TabsContent>

                <TabsContent value="memories" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {memories.map((mem: any) => (
                            <Card key={Number(mem.id)} className="bg-zinc-900/50 border-zinc-800 flex flex-col">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                                            {mem.agent_id}
                                        </Badge>
                                        <span className="text-xs text-zinc-500">
                                            {mem.created_at?.toLocaleDateString()}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <p className="text-sm text-zinc-300 line-clamp-4">{mem.content}</p>
                                    {mem.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-3">
                                            {mem.tags.map((tag: any) => (
                                                <span key={tag} className="text-[10px] text-zinc-500 bg-zinc-950 px-1 rounded">#{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="daily" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {dailyNotes.map((note: any) => (
                            <Card key={Number(note.id)} className="bg-zinc-900/50 border-zinc-800 flex flex-col">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-white text-base">
                                        {new Date(note.note_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <div className="text-sm text-zinc-300 whitespace-pre-wrap font-mono text-xs">
                                        {note.content.substring(0, 500)}...
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="stats" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                                    <Brain className="h-4 w-4" /> Total Memories
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">{totalMemories}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                                    <Calendar className="h-4 w-4" /> Daily Notes
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">{totalNotes}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" /> Avg Importance
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">
                                    {avgImportance.toFixed(1) || '0'}
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                                    <Tag className="h-4 w-4" /> Tagged
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">{taggedCount}</div>
                                <p className="text-xs text-zinc-500 mt-1">
                                    {totalMemories > 0 ? Math.round((taggedCount / totalMemories) * 100) : 0}% of total
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
