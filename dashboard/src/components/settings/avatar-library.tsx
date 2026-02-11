"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface AvatarFile {
    name: string
    size: number
}

export function AvatarLibrary() {
    const [avatars, setAvatars] = useState<AvatarFile[]>([])

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch("/api/avatars/library")
                if (res.ok) setAvatars(await res.json())
            } catch (e) {
                console.error("Failed to fetch avatar library", e)
            }
        }
        fetchData()
    }, [])

    return (
        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-zinc-400">Avatar Library</CardTitle>
            </CardHeader>
            <CardContent>
                {avatars.length === 0 ? (
                    <div className="text-zinc-500 text-sm">No avatars found. Upload some!</div>
                ) : (
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {avatars.map((avatar) => (
                            <div key={avatar.name} className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
                                <Avatar className="h-16 w-16 border border-zinc-700">
                                    <AvatarImage src={`/assets/minion-avatars/${avatar.name}`} />
                                    <AvatarFallback className="text-xs">{avatar.name.substring(0, 3)}</AvatarFallback>
                                </Avatar>
                                <div className="text-xs text-zinc-400 text-center truncate w-full">{avatar.name}</div>
                                <div className="text-[10px] text-zinc-600">{(avatar.size / 1024).toFixed(1)} KB</div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
