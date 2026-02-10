"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"

interface Agent {
    agent_id: string
    name: string
}

interface EventFiltersProps {
    agents: Agent[]
}

export function EventFilters({ agents }: EventFiltersProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const agentId = searchParams.get("agent_id") || ""
    const eventType = searchParams.get("event_type") || ""
    const dateFrom = searchParams.get("date_from") || ""

    const updateFilter = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value) {
            params.set(key, value)
        } else {
            params.delete(key)
        }
        router.push(`/events?${params.toString()}`)
    }

    const clearFilters = () => {
        router.push("/events")
    }

    const hasFilters = agentId || eventType || dateFrom

    return (
        <div className="flex flex-wrap items-end gap-4 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
            <div className="flex-1 min-w-[200px]">
                <Label htmlFor="agent-filter" className="text-zinc-400 text-sm mb-2 block">
                    Agent
                </Label>
                <Select value={agentId} onValueChange={(val) => updateFilter("agent_id", val)}>
                    <SelectTrigger id="agent-filter" className="bg-zinc-950 border-zinc-800 text-white">
                        <SelectValue placeholder="All agents" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="">All agents</SelectItem>
                        {agents.map((agent) => (
                            <SelectItem key={agent.agent_id} value={agent.agent_id}>
                                {agent.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
                <Label htmlFor="type-filter" className="text-zinc-400 text-sm mb-2 block">
                    Event Type
                </Label>
                <Input
                    id="type-filter"
                    value={eventType}
                    onChange={(e) => updateFilter("event_type", e.target.value)}
                    placeholder="e.g., memory, workflow, level"
                    className="bg-zinc-950 border-zinc-800 text-white"
                />
            </div>

            <div className="flex-1 min-w-[200px]">
                <Label htmlFor="date-filter" className="text-zinc-400 text-sm mb-2 block">
                    From Date
                </Label>
                <Input
                    id="date-filter"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => updateFilter("date_from", e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white"
                />
            </div>

            {hasFilters && (
                <Button
                    variant="outline"
                    size="icon"
                    onClick={clearFilters}
                    className="border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                    title="Clear filters"
                >
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    )
}
