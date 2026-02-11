"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AvatarFile {
    name: string
    size: number
}

export function DefaultAvatarSettings() {
    const [avatars, setAvatars] = useState<AvatarFile[]>([])
    const [current, setCurrent] = useState("default.webp")

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch("/api/avatars/library")
                if (res.ok) setAvatars(await res.json())
            } catch (e) {
                console.error("Failed to fetch avatars", e)
            }
        }
        fetchData()
    }, [])

    return (
        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-zinc-400">Default Avatar</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border border-zinc-700">
                        <AvatarImage src={`/assets/minion-avatars/${current}`} />
                    </Avatar>
                    <div className="text-sm text-zinc-400">
                        This avatar is used for agents without a custom one.
                        <br />
                        <span className="text-zinc-500">Current: {current}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
