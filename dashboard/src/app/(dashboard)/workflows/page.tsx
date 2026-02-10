import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { GitGraph, Play, Clock, Activity } from "lucide-react"
import { RunTrigger } from "@/components/workflows/run-trigger"

export default async function WorkflowsPage() {
    const session = await auth()
    if (!session) redirect("/login")

    const workflows = await prisma.workflows.findMany({
        orderBy: { name: 'asc' },
        include: {
            _count: {
                select: { runs: true }
            }
        }
    })

    // Mock stats for now as aggregation might be heavy or need raw query
    // In real app, we'd aggregate success rate etc.

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight text-white">Workflows</h2>
                <Button className="bg-amber-500 text-zinc-950 hover:bg-amber-400">
                    <Play className="mr-2 h-4 w-4" /> New Run
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {workflows.map((workflow: any) => (
                    <Card key={workflow.id} className="bg-zinc-900/50 border-zinc-800 flex flex-col">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <GitGraph className="h-5 w-5 text-zinc-500" />
                                    <CardTitle className="text-xl text-white">{workflow.name}</CardTitle>
                                </div>
                                <Badge variant={workflow.enabled ? "default" : "secondary"} className={workflow.enabled ? "bg-green-500/10 text-green-500" : "bg-zinc-800 text-zinc-500"}>
                                    {workflow.enabled ? "Active" : "Disabled"}
                                </Badge>
                            </div>
                            <CardDescription className="line-clamp-2 h-10">
                                {workflow.description || "No description provided."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                                <div className="flex flex-col gap-1">
                                    <span className="text-zinc-500 text-xs">Total Runs</span>
                                    <span className="text-white font-mono">{workflow._count.runs}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-zinc-500 text-xs">Version</span>
                                    <span className="text-white font-mono">v{workflow.version}</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="border-t border-zinc-800 pt-4 bg-zinc-950/30">
                            <div className="flex w-full gap-2">
                                <RunTrigger 
                                    workflowId={workflow.id} 
                                    workflowName={workflow.name}
                                    enabled={workflow.enabled}
                                />
                                <Button variant="ghost" className="flex-1 text-zinc-400 hover:text-white" asChild>
                                    <Link href={`/runs?workflow_id=${workflow.id}`}>History</Link>
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    )
}
