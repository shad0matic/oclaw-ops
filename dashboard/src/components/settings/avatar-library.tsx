
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

interface Avatar {
    name: string
    size: number
}

export function AvatarLibrary() {
    const [avatars, setAvatars] = useState<Avatar[]>([])

    useEffect(() => {
        // Fetch avatars from API
        async function fetchData() {
            const avatarsRes = await fetch("/api/avatars/library")
            const avatarsData = await avatarsRes.json()
            setAvatars(avatarsData)
        }
        fetchData()
    }, [])

    const handleDelete = (avatarName: string) => {
        // Call API to delete avatar
        console.log(`Deleting avatar: ${avatarName}`)
    }

    return (
        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-zinc-400">Avatar Library</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {avatars.map((avatar) => (
                        <div key={avatar.name} className="flex flex-col items-center gap-2">
                            <Avatar className="h-20 w-20 border border-zinc-700">
                                <AvatarImage src={`/assets/minion-avatars/${avatar.name}`} />
                                <AvatarFallback>{avatar.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="text-sm text-zinc-400">{avatar.name}</div>
                            <div className="text-xs text-zinc-500">{(avatar.size / 1024).toFixed(1)} KB</div>
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(avatar.name)}>
                                Delete
                            </Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
