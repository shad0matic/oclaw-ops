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

interface Workflow {
    id: number
    name: string
}

interface RunFiltersProps {
    workflows: Workflow[]
}

export function RunFilters({ workflows }: RunFiltersProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const status = searchParams.get("status") || ""
    const workflowId = searchParams.get("workflow_id") || ""
    const agentId = searchParams.get("agent_id") || ""

    const updateFilter = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value) {
            params.set(key, value)
        } else {
            params.delete(key)
        }
        router.push(`/runs?${params.toString()}`)
    }

    const clearFilters = () => {
        router.push("/runs")
    }

    const hasFilters = status || workflowId || agentId

    return (
        <div className="flex flex-wrap items-end gap-4 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
            <div className="flex-1 min-w-[200px]">
                <Label htmlFor="status-filter" className="text-zinc-400 text-sm mb-2 block">
                    Status
                </Label>
                <Select value={status} onValueChange={(val) => updateFilter("status", val)}>
                    <SelectTrigger id="status-filter" className="bg-zinc-950 border-zinc-800 text-white">
                        <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="">All statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="running">Running</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
                <Label htmlFor="workflow-filter" className="text-zinc-400 text-sm mb-2 block">
                    Workflow
                </Label>
                <Select value={workflowId} onValueChange={(val) => updateFilter("workflow_id", val)}>
                    <SelectTrigger id="workflow-filter" className="bg-zinc-950 border-zinc-800 text-white">
                        <SelectValue placeholder="All workflows" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="">All workflows</SelectItem>
                        {workflows.map((wf) => (
                            <SelectItem key={wf.id} value={wf.id.toString()}>
                                {wf.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
                <Label htmlFor="agent-filter" className="text-zinc-400 text-sm mb-2 block">
                    Agent ID
                </Label>
                <Input
                    id="agent-filter"
                    value={agentId}
                    onChange={(e) => updateFilter("agent_id", e.target.value)}
                    placeholder="Filter by agent"
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
