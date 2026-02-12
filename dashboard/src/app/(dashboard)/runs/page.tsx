import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/db"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, Play, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { RunFilters } from "@/components/runs/run-filters"
import { Prisma } from "@/generated/prisma/client"
import { Suspense } from "react"
import { PageHeader } from "@/components/layout/page-header"

export default async function RunsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
    const session = await auth()
    if (!session) redirect("/login")

    const params = await searchParams
    const status = params.status
    const workflowId = params.workflow_id
    const agentId = params.agent_id

    // Build where clause
    const where: Prisma.runsWhereInput = {}
    if (status) where.status = status
    if (workflowId) where.workflow_id = parseInt(workflowId)
    if (agentId) {
        where.steps = {
            some: { agent_id: agentId }
        }
    }

    const [runs, workflows] = await Promise.all([
        prisma.runs.findMany({
            where,
            orderBy: { created_at: 'desc' },
            take: 50,
            include: {
                workflows: { select: { name: true } }
            }
        }),
        prisma.workflows.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        }).then(wfs => wfs.map(wf => ({ ...wf, id: Number(wf.id) })))
    ])

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <PageHeader title="Run History" subtitle="Workflow execution log — status, duration, and outcomes for every run." />
            </div>

            <Suspense fallback={<div className="text-zinc-500">Loading filters...</div>}>
                <RunFilters workflows={workflows} />
            </Suspense>

            <div className="rounded-md border border-zinc-800 bg-zinc-900/50 overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="border-zinc-800 hover:bg-transparent">
                            <TableHead className="text-zinc-400">Workflow</TableHead>
                            <TableHead className="text-zinc-400">Status</TableHead>
                            <TableHead className="text-zinc-400">Task</TableHead>
                            <TableHead className="text-zinc-400">Triggered By</TableHead>
                            <TableHead className="text-zinc-400">Duration</TableHead>
                            <TableHead className="text-zinc-400">Started</TableHead>
                            <TableHead className="text-right text-zinc-400">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {runs.map((run: any) => {
                            const duration = run.completed_at && run.started_at
                                ? Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000) + 's'
                                : '-'

                            return (
                                <TableRow key={Number(run.id)} className="border-zinc-800 hover:bg-zinc-800/50">
                                    <TableCell className="font-medium text-white">
                                        <div className="flex items-center gap-2">
                                            <Play className="h-4 w-4 text-zinc-500" />
                                            {run.workflows?.name || 'Unknown'}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <RunStatusBadge status={run.status || 'unknown'} />
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate text-zinc-300" title={run.task || ''}>
                                        {run.task}
                                    </TableCell>
                                    <TableCell className="text-zinc-400">{run.triggered_by}</TableCell>
                                    <TableCell className="text-zinc-400 font-mono text-xs">{duration}</TableCell>
                                    <TableCell className="text-zinc-400 text-sm">
                                        {run.created_at?.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" asChild>
                                            <Link href={`/runs/${Number(run.id)}`}>
                                                <ArrowRight className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

function RunStatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'completed':
        case 'success':
            return <Badge variant="default" className="bg-green-500/10 text-green-500 hover:bg-green-500/20"><CheckCircle2 className="mr-1 h-3 w-3" /> Done</Badge>
        case 'failed':
        case 'error':
            return <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20"><XCircle className="mr-1 h-3 w-3" /> Failed</Badge>
        case 'running':
            return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 animate-pulse"><Clock className="mr-1 h-3 w-3" /> Running</Badge>
        default:
            return <Badge variant="outline" className="text-zinc-500"><AlertCircle className="mr-1 h-3 w-3" /> {status}</Badge>
    }
}
