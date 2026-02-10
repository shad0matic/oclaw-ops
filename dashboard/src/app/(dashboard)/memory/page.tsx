import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Brain, Calendar, Database } from "lucide-react"

export default async function MemoryPage() {
    const session = await auth()
    if (!session) redirect("/login")

    const [memories, dailyNotes, stats] = await Promise.all([
        prisma.memories.findMany({
            orderBy: { created_at: 'desc' },
            take: 20
        }),
        prisma.daily_notes.findMany({
            orderBy: { note_date: 'desc' },
            take: 10
        }),
        prisma.memories.count()
    ])

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight text-white">Memory Bank</h2>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <Input
                    placeholder="Search memories (vector search not implemented in UI yet)..."
                    className="pl-10 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Total Memories</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats}</div>
                    </CardContent>
                </Card>
                {/* Add more stats if needed */}
            </div>

            <Tabs defaultValue="memories" className="space-y-4">
                <TabsList className="bg-zinc-900 border border-zinc-800">
                    <TabsTrigger value="memories">Long-term Memory</TabsTrigger>
                    <TabsTrigger value="daily">Daily Notes</TabsTrigger>
                </TabsList>

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
            </Tabs>
        </div>
    )
}
