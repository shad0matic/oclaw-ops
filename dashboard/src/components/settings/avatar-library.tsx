"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

interface AvatarFile {
    name: string
    size: number
}

export function AvatarLibrary({ refreshKey = 0, onDelete }: { refreshKey?: number; onDelete?: () => void }) {
    const [avatars, setAvatars] = useState<AvatarFile[]>([])
    const [deleting, setDeleting] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)

    const fetchAvatars = async () => {
        try {
            const res = await fetch("/api/avatars/library")
            if (res.ok) setAvatars(await res.json())
        } catch (e) {
            console.error("Failed to fetch avatar library", e)
        }
    }

    useEffect(() => { fetchAvatars() }, [refreshKey])

    const handleDelete = async (name: string) => {
        if (!confirm(`Delete ${name}? This can't be undone.`)) return
        setDeleting(name)
        setMessage(null)
        try {
            const res = await fetch("/api/avatars/library", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            })
            if (res.ok) {
                setMessage(`🗑️ Deleted ${name}`)
                setAvatars((prev) => prev.filter((a) => a.name !== name))
                onDelete?.()
            } else {
                const data = await res.json()
                setMessage(`❌ ${data.error || "Delete failed"}`)
            }
        } catch (e) {
            setMessage("❌ Network error")
        } finally {
            setDeleting(null)
        }
    }

    return (
        <Card className="bg-card/50 border-border backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-muted-foreground">Avatar Library</CardTitle>
            </CardHeader>
            <CardContent>
                {message && (
                    <div className="mb-4 text-sm text-foreground/80 bg-muted/50 rounded px-3 py-2">
                        {message}
                    </div>
                )}
                {avatars.length === 0 ? (
                    <div className="text-muted-foreground/70 text-sm">No avatars found. Upload some!</div>
                ) : (
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {avatars.map((avatar) => (
                            <div key={avatar.name} className="group flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors relative">
                                <Avatar className="h-16 w-16 border border-border">
                                    <AvatarImage src={`/assets/minion-avatars/${avatar.name}`} onError={(e) => { (e.target as HTMLImageElement).src = '/assets/minion-avatars/default.webp' }} />
                                    <AvatarFallback className="text-xs">{avatar.name.substring(0, 3)}</AvatarFallback>
                                </Avatar>
                                <div className="text-xs text-muted-foreground text-center truncate w-full">{avatar.name}</div>
                                <div className="text-[10px] text-muted-foreground/50">{(avatar.size / 1024).toFixed(1)} KB</div>
                                {avatar.name !== "default.webp" && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 right-1 h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                        onClick={() => handleDelete(avatar.name)}
                                        disabled={deleting === avatar.name}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
