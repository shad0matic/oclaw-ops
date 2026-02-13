"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Brain, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react"

type MemoryCheckStatus = {
    healthy: boolean
    diff: string[]
    syncAge?: {
        hours: number
        stale: boolean
    }
    db?: {
        totalMemories?: number
        fromMemoryMd?: number
        fromDaily?: number
        withEmbeddings?: number
        lastSynced?: string | null
        entities?: number
    }
    files?: {
        memoryMdSections?: number
        dailyNotes?: number
        latestNote?: string | null
    }
}

type MemorySyncResponse =
    | { ok: true; syncOutput: string; totalMemories: number; lastSynced: string | null }
    | { ok: false; error: string }

export function MemoryCheck() {
    const [status, setStatus] = useState<MemoryCheckStatus | null>(null)
    const [syncing, setSyncing] = useState(false)
    const [checking, setChecking] = useState(false)

    const checkMemory = async (): Promise<void> => {
        setChecking(true)
        try {
            const res = await fetch("/api/memory/check")
            if (res.ok) setStatus((await res.json()) as MemoryCheckStatus)
        } catch {
            // ignore
        } finally {
            setChecking(false)
        }
    }

    const syncMemory = async (): Promise<void> => {
        setSyncing(true)
        try {
            const res = await fetch("/api/memory/check", { method: "POST" })
            const data = (await res.json()) as MemorySyncResponse
            if (data.ok) {
                // Refresh status after sync
                await checkMemory()
            }
        } catch {
            // ignore
        } finally {
            setSyncing(false)
        }
    }

    return (
        <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-zinc-400 flex items-center gap-2">
                        <Brain className="h-4 w-4" /> Memory Health Check
                    </CardTitle>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={checkMemory}
                            disabled={checking}
                            className="border-zinc-700 text-zinc-400 hover:text-white"
                        >
                            {checking ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : null}
                            Check
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={syncMemory}
                            disabled={syncing}
                            className="border-blue-700 text-blue-400 hover:text-blue-300"
                        >
                            {syncing ? (
                                <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                                <RefreshCw className="h-3 w-3 mr-1" />
                            )}
                            Sync Now
                        </Button>
                    </div>
                </div>
            </CardHeader>
            {status && (
                <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                        {status.healthy ? (
                            <Badge className="bg-green-500/10 text-green-400">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Healthy
                            </Badge>
                        ) : (
                            <Badge className="bg-yellow-500/10 text-yellow-400">
                                <AlertTriangle className="h-3 w-3 mr-1" /> Needs Attention
                            </Badge>
                        )}
                        <span className="text-xs text-zinc-500">Last sync: {status.syncAge?.hours}h ago</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-2 rounded bg-zinc-950/50 border border-zinc-800">
                            <div className="text-xs text-zinc-500">DB Memories</div>
                            <div className="text-lg font-bold text-white">{status.db?.totalMemories}</div>
                        </div>
                        <div className="p-2 rounded bg-zinc-950/50 border border-zinc-800">
                            <div className="text-xs text-zinc-500">Embeddings</div>
                            <div className="text-lg font-bold text-white">{status.db?.withEmbeddings}</div>
                        </div>
                        <div className="p-2 rounded bg-zinc-950/50 border border-zinc-800">
                            <div className="text-xs text-zinc-500">Entities</div>
                            <div className="text-lg font-bold text-white">{status.db?.entities}</div>
                        </div>
                        <div className="p-2 rounded bg-zinc-950/50 border border-zinc-800">
                            <div className="text-xs text-zinc-500">Daily Notes</div>
                            <div className="text-lg font-bold text-white">{status.files?.dailyNotes}</div>
                        </div>
                    </div>

                    {status.diff?.length > 0 && (
                        <div className="space-y-1">
                            {status.diff.map((d, i) => (
                                <div key={i} className="text-xs text-yellow-400 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" /> {d}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    )
}
