"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface Agent {
    agent_id: string
    name: string
    status: string
}

interface AvatarFile {
    name: string
    size: number
}

export function AgentAvatarManager({ refreshKey = 0 }: { refreshKey?: number }) {
    const [agents, setAgents] = useState<Agent[]>([])
    const [avatars, setAvatars] = useState<AvatarFile[]>([])
    const [assigning, setAssigning] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const [overrides, setOverrides] = useState<Record<string, string>>({})

    useEffect(() => {
        async function fetchData() {
            try {
                const [agentsRes, avatarsRes] = await Promise.all([
                    fetch("/api/agents"),
                    fetch("/api/avatars/library"),
                ])
                if (agentsRes.ok) setAgents(await agentsRes.json())
                if (avatarsRes.ok) setAvatars(await avatarsRes.json())
            } catch (e) {
                console.error("Failed to load settings data", e)
            }
        }
        fetchData()
    }, [refreshKey])

    const handleAvatarChange = async (agentId: string, avatarFile: string) => {
        setAssigning(agentId)
        setMessage(null)
        try {
            const res = await fetch("/api/avatars/assign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agentId, avatarFile }),
            })
            if (res.ok) {
                setMessage(`✅ Avatar assigned to ${agentId}`)
                setOverrides((prev) => ({ ...prev, [agentId]: avatarFile }))
            } else {
                const data = await res.json()
                setMessage(`❌ ${data.error || "Failed to assign"}`)
            }
        } catch (e) {
            setMessage("❌ Network error")
        } finally {
            setAssigning(null)
        }
    }

    const currentAvatar = (agentId: string) => {
        if (overrides[agentId]) return overrides[agentId]
        const match = avatars.find(
            (a) => a.name.replace(/\.[^.]+$/, "") === agentId
        )
        return match?.name || "default.webp"
    }

    return (
        <Card className="bg-card/50 border-border backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-muted-foreground">Agent Avatars</CardTitle>
            </CardHeader>
            <CardContent>
                {message && (
                    <div className="mb-4 text-sm text-foreground/80 bg-muted/50 rounded px-3 py-2">
                        {message}
                    </div>
                )}
                <div className="space-y-4">
                    {agents.map((agent) => (
                        <div key={agent.agent_id} className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-10 w-10 border border-border">
                                    <AvatarImage
                                        src={`/assets/minion-avatars/${currentAvatar(agent.agent_id)}?v=${refreshKey}`}
                                    />
                                    <AvatarFallback>{agent.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-medium text-foreground">{agent.name}</div>
                                    <div className="text-sm text-muted-foreground/70">{agent.agent_id}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] text-muted-foreground/70 border-border">
                                    {currentAvatar(agent.agent_id)}
                                </Badge>
                                <Select
                                    value={currentAvatar(agent.agent_id)}
                                    onValueChange={(value) => handleAvatarChange(agent.agent_id, value)}
                                    disabled={assigning === agent.agent_id}
                                >
                                    <SelectTrigger className="w-[200px] bg-muted border-border">
                                        <SelectValue placeholder="Select avatar..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-muted border-border">
                                        {avatars.map((avatar) => (
                                            <SelectItem key={avatar.name} value={avatar.name}>
                                                <span className="flex items-center gap-2">
                                                    <span>{avatar.name}</span>
                                                    <span className="text-muted-foreground/70 text-xs">
                                                        ({(avatar.size / 1024).toFixed(0)} KB)
                                                    </span>
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    ))}
                    {agents.length === 0 && (
                        <div className="text-muted-foreground/70 text-sm">Loading agents...</div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
