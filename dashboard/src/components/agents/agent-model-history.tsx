"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getAgentModelHistory } from "@/app/(dashboard)/agents/actions"
import { useState } from "react"

export function AgentModelHistory({ agentId }: { agentId: string }) {
    const [history, setHistory] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    async function fetchHistory() {
        setLoading(true)
        const historyData = await getAgentModelHistory(agentId)
        setHistory(historyData)
        setLoading(false)
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={fetchHistory}>View History</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Model Usage History</DialogTitle>
                    <DialogDescription>
                        Recent model usage for agent {agentId}
                    </DialogDescription>
                </DialogHeader>
                <div>
                    {loading ? (
                        <p>Loading...</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Model</TableHead>
                                    <TableHead className="text-right">Calls</TableHead>
                                    <TableHead className="text-right">Input Tokens</TableHead>
                                    <TableHead className="text-right">Output Tokens</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map((row, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                                        <TableCell>{row.model}</TableCell>
                                        <TableCell className="text-right">{row.calls}</TableCell>
                                        <TableCell className="text-right">{row.input.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">{row.output.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
