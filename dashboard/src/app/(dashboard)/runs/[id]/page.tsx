import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle, Play, ChevronRight, RefreshCw, Terminal } from "lucide-react"
import { RunActions } from "@/components/runs/run-actions"

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth()
    if (!session) redirect("/login")

    const { id } = await params

    const run = await prisma.runs.findUnique({
        where: { id: Number(id) },
        include: {
            steps: {
                orderBy: { step_order: 'asc' }
            },
            workflows: true
        }
    })

    if (!run) return <div className="p-8 text-white">Run not found</div>

    const duration = run.completed_at && run.started_at
        ? Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000) + 's'
        : '-'

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/runs"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold tracking-tight text-white">{run.workflow_name}</h2>
                        <RunStatusBadge status={run.status || 'unknown'} />
                        <span className="text-zinc-500 text-sm font-mono">#{String(run.id)}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-zinc-400 mt-1">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {duration}</span>
                        <span>•</span>
                        <span>Triggered by {run.triggered_by}</span>
                        <span>•</span>
                        <span>{run.created_at?.toLocaleString()}</span>
                    </div>
                </div>
                <div className="ml-auto">
                    <RunActions 
                        runId={String(run.id)} 
                        workflowId={run.workflow_id}
                        status={run.status || 'unknown'}
                        task={run.task}
                    />
                </div>
            </div>

            {/* Task & Context */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2 bg-zinc-900/50 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg">Task</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-zinc-300 whitespace-pre-wrap">{run.task}</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg">Result</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="text-xs text-zinc-400 bg-zinc-950 p-2 rounded overflow-auto max-h-[200px]">
                            {JSON.stringify(run.result, null, 2)}
                        </pre>
                    </CardContent>
                </Card>
            </div>

            {/* Steps Timeline */}
            <div className="relative border-l border-zinc-800 ml-4 space-y-8 pl-8 pb-8">
                {run.steps.map((step: any) => (
                    <div key={Number(step.id)} className="relative">
                        {/* Timeline dot */}
                        <div className={`absolute -left-[39px] top-1 h-5 w-5 rounded-full border-4 border-zinc-950 ${step.status === 'completed' ? 'bg-green-500' :
                            step.status === 'failed' ? 'bg-red-500' :
                                step.status === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-zinc-700'
                            }`} />

                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <CardHeader className="py-3 px-4 flex flex-row items-center gap-4 bg-zinc-800/20">
                                <div className="flex flex-col">
                                    <CardTitle className="text-base text-white">{step.step_name}</CardTitle>
                                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                                        <span>Agent: {step.agent_id}</span>
                                        {step.retries && step.retries > 0 ? (
                                            <span className="text-amber-500">• {step.retries} retries</span>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="ml-auto">
                                    <StepStatusBadge status={step.status || 'pending'} />
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                {/* Input/Output/Error toggles could go here, keeping it simple for now */}
                                {step.error && (
                                    <div className="rounded bg-red-950/20 border border-red-900/50 p-3 text-sm text-red-200 font-mono overflow-auto">
                                        {step.error}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-xs font-semibold text-zinc-500 mb-1 flex items-center gap-1">
                                            <Terminal className="h-3 w-3" /> Input
                                        </div>
                                        <div className="rounded bg-zinc-950 p-2 text-xs font-mono text-zinc-400 overflow-auto max-h-[150px]">
                                            {JSON.stringify(step.input, null, 2)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold text-zinc-500 mb-1 flex items-center gap-1">
                                            <Terminal className="h-3 w-3" /> Output
                                        </div>
                                        <div className="rounded bg-zinc-950 p-2 text-xs font-mono text-zinc-400 overflow-auto max-h-[150px]">
                                            {JSON.stringify(step.output, null, 2)}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </div>
        </div>
    )
}

function RunStatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'completed':
        case 'success':
            return <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">Completed</Badge>
        case 'failed':
        case 'error':
            return <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">Failed</Badge>
        case 'running':
            return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse">Running</Badge>
        default:
            return <Badge variant="outline" className="text-zinc-500 border-zinc-800">{status}</Badge>
    }
}

function StepStatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'completed':
        case 'success':
            return <span className="text-xs font-medium text-green-500 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Done</span>
        case 'failed':
        case 'error':
            return <span className="text-xs font-medium text-red-500 flex items-center gap-1"><XCircle className="h-3 w-3" /> Failed</span>
        case 'running':
            return <span className="text-xs font-medium text-blue-500 flex items-center gap-1 animate-pulse"><Clock className="h-3 w-3" /> Running</span>
        default:
            return <span className="text-xs font-medium text-zinc-600">{status}</span>
    }
}
