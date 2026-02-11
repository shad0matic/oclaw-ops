
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Agent {
    agent_id: string
    name: string
    avatar: string
}

export function AgentAvatarManager() {
    const [agents, setAgents] = useState<Agent[]>([])
    const [avatars, setAvatars] = useState<string[]>([])

    useEffect(() => {
        // Fetch agents and avatars from API
        async function fetchData() {
            const agentsRes = await fetch("/api/agents")
            const agentsData = await agentsRes.json()
            setAgents(agentsData)

            const avatarsRes = await fetch("/api/avatars/library")
            const avatarsData = await avatarsRes.json()
            setAvatars(avatarsData)
        }
        fetchData()
    }, [])

    const handleAvatarChange = (agentId: string, avatar: string) => {
        // Call API to update agent avatar
        console.log(`Updating agent ${agentId} to use avatar ${avatar}`)
    }

    return (
        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-zinc-400">Agent Avatars</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {agents.map((agent) => (
                        <div key={agent.agent_id} className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-10 w-10 border border-zinc-700">
                                    <AvatarImage src={`/assets/minion-avatars/${agent.avatar}`} />
                                    <AvatarFallback>{agent.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-medium text-white">{agent.name}</div>
                                    <div className="text-sm text-zinc-500">{agent.agent_id}</div>
                                </div>
                            </div>
                            <Select onValueChange={(value) => handleAvatarChange(agent.agent_id, value)} defaultValue={agent.avatar}>
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
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
