
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

export function DefaultAvatarSettings() {
    const [avatars, setAvatars] = useState<string[]>([])
    const [defaultAvatar, setDefaultAvatar] = useState<string>("")

    useEffect(() => {
        // Fetch avatars from API
        async function fetchData() {
            const avatarsRes = await fetch("/api/avatars/library")
            const avatarsData = await avatarsRes.json()
            setAvatars(avatarsData)
        }
        fetchData()
    }, [])

    const handleDefaultAvatarChange = (avatar: string) => {
        setDefaultAvatar(avatar)
    }

    const handleSave = () => {
        // Call API to save default avatar
        console.log(`Saving default avatar: ${defaultAvatar}`)
    }

    return (
        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-zinc-400">Default Avatar</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4">
                    <Select onValueChange={handleDefaultAvatarChange} value={defaultAvatar}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select avatar" />
                        </SelectTrigger>
                        <SelectContent>
                            {avatars.map((avatar) => (
                                <SelectItem key={avatar} value={avatar}>
                                    {avatar}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleSave}>Save</Button>
                </div>
            </CardContent>
        </Card>
    )
}
