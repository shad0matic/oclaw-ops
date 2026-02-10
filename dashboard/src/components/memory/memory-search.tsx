"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface SearchResult {
    id: string
    content: string
    tags: string[]
    agent_id?: string
    note_date?: string
    created_at: string
    importance?: number
}

export function MemorySearch() {
    const [query, setQuery] = useState("")
    const [type, setType] = useState<"memories" | "daily_notes">("memories")
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState<SearchResult[]>([])
    const [searched, setSearched] = useState(false)

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!query.trim()) {
            toast.error("Please enter a search query")
            return
        }

        setLoading(true)
        setSearched(false)
        try {
            const res = await fetch("/api/memory/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: query.trim(), type, limit: 20 })
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || "Search failed")
            }

            const data = await res.json()
            setResults(data.results || [])
            setSearched(true)
            
            if (data.results.length === 0) {
                toast.info("No results found")
            }
        } catch (error: any) {
            toast.error(error.message)
            setResults([])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search memories..."
                        className="pl-10 bg-zinc-900/50 border-zinc-800 text-white"
                        disabled={loading}
                    />
                </div>
                <Select value={type} onValueChange={(val: "memories" | "daily_notes") => setType(val)}>
                    <SelectTrigger className="w-[180px] bg-zinc-900/50 border-zinc-800 text-white">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="memories">Memories</SelectItem>
                        <SelectItem value="daily_notes">Daily Notes</SelectItem>
                    </SelectContent>
                </Select>
                <Button 
                    type="submit" 
                    disabled={loading}
                    className="bg-amber-500 text-zinc-950 hover:bg-amber-400"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
            </form>

            {searched && (
                <div className="space-y-4">
                    <div className="text-sm text-zinc-400">
                        Found {results.length} result{results.length !== 1 ? 's' : ''}
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {results.map((result) => (
                            <Card key={result.id} className="bg-zinc-900/50 border-zinc-800">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        {result.agent_id && (
                                            <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                                                {result.agent_id}
                                            </Badge>
                                        )}
                                        {result.importance && (
                                            <Badge variant="outline" className="border-amber-700 text-amber-400">
                                                ★ {result.importance}
                                            </Badge>
                                        )}
                                        <span className="text-xs text-zinc-500">
                                            {result.note_date 
                                                ? new Date(result.note_date).toLocaleDateString()
                                                : new Date(result.created_at).toLocaleDateString()
                                            }
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-zinc-300 line-clamp-4">{result.content}</p>
                                    {result.tags && result.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-3">
                                            {result.tags.map((tag) => (
                                                <span key={tag} className="text-[10px] text-zinc-500 bg-zinc-950 px-1 rounded">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
