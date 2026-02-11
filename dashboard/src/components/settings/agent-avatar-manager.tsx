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
                // Force avatar refresh by updating agents list
                setAgents((prev) => [...prev])
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

    // Current avatar for an agent (agent_id.webp if exists, otherwise default)
    const currentAvatar = (agentId: string) => {
        const match = avatars.find(
            (a) => a.name.replace(/\.[^.]+$/, "") === agentId
        )
        return match?.name || "default.webp"
    }

    return (
        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-zinc-400">Agent Avatars</CardTitle>
            </CardHeader>
            <CardContent>
                {message && (
                    <div className="mb-4 text-sm text-zinc-300 bg-zinc-800/50 rounded px-3 py-2">
                        {message}
                    </div>
                )}
                <div className="space-y-4">
                    {agents.map((agent) => (
                        <div key={agent.agent_id} className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-10 w-10 border border-zinc-700">
                                    <AvatarImage
                                        key={Date.now()}
                                        src={`/assets/minion-avatars/${currentAvatar(agent.agent_id)}?t=${Date.now()}`}
                                    />
                                    <AvatarFallback>{agent.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-medium text-white">{agent.name}</div>
                                    <div className="text-sm text-zinc-500">{agent.agent_id}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-700">
                                    {currentAvatar(agent.agent_id)}
                                </Badge>
                                <Select
                                    onValueChange={(value) => handleAvatarChange(agent.agent_id, value)}
                                    defaultValue={currentAvatar(agent.agent_id)}
                                    disabled={assigning === agent.agent_id}
                                >
                                    <SelectTrigger className="w-[200px] bg-zinc-800 border-zinc-700">
                                        <SelectValue placeholder="Select avatar..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-800 border-zinc-700">
                                        {avatars.map((avatar) => (
                                            <SelectItem key={avatar.name} value={avatar.name}>
                                                <span className="flex items-center gap-2">
                                                    <span>{avatar.name}</span>
                                                    <span className="text-zinc-500 text-xs">
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
                        <div className="text-zinc-500 text-sm">Loading agents...</div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
