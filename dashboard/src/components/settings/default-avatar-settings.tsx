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
        <Card className="bg-card/50 border-border backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-muted-foreground">Default Avatar</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border border-border">
                        <AvatarImage src={`/assets/minion-avatars/${current}`} />
                    </Avatar>
                    <div className="text-sm text-muted-foreground">
                        This avatar is used for agents without a custom one.
                        <br />
                        <span className="text-muted-foreground/70">Current: {current}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
