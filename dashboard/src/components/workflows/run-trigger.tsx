"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Play } from "lucide-react"
import { toast } from "sonner"

interface RunTriggerProps {
    workflowId: number
    workflowName: string
    enabled: boolean
}

export function RunTrigger({ workflowId, workflowName, enabled }: RunTriggerProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [task, setTask] = useState("")
    const [context, setContext] = useState("")

    const handleRun = async () => {
        setLoading(true)
        try {
            // Parse context JSON if provided
            let parsedContext = {}
            if (context.trim()) {
                try {
                    parsedContext = JSON.parse(context)
                } catch (e) {
                    toast.error("Invalid JSON in context field")
                    setLoading(false)
                    return
                }
            }

            const res = await fetch(`/api/workflows/${workflowId}/run`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ task, context: parsedContext })
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || "Failed to trigger run")
            }

            const run = await res.json()
            toast.success(`Workflow "${workflowName}" triggered!`)
            setOpen(false)
            setTask("")
            setContext("")
            
            // Navigate to the run detail page
            router.push(`/runs/${run.id}`)
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    size="sm"
                    disabled={!enabled}
                    className="bg-amber-500 text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                >
                    <Play className="mr-2 h-4 w-4" />
                    Run
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle className="text-white">Trigger Workflow</DialogTitle>
                    <DialogDescription>
                        Run workflow: <span className="font-mono text-amber-400">{workflowName}</span>
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="task" className="text-zinc-400">
                            Task Description
                        </Label>
                        <Textarea
                            id="task"
                            value={task}
                            onChange={(e) => setTask(e.target.value)}
                            placeholder="Describe what this run should accomplish"
                            className="bg-zinc-950 border-zinc-800 text-white"
                            rows={3}
                        />
                    </div>
                    <div>
                        <Label htmlFor="context" className="text-zinc-400">
                            Context (JSON, optional)
                        </Label>
                        <Textarea
                            id="context"
                            value={context}
                            onChange={(e) => setContext(e.target.value)}
                            placeholder='{"key": "value"}'
                            className="bg-zinc-950 border-zinc-800 text-white font-mono text-sm"
                            rows={4}
                        />
                        <p className="text-xs text-zinc-500 mt-1">
                            Optional JSON object for additional context
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        className="border-zinc-700 bg-zinc-900 text-zinc-300"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleRun}
                        disabled={loading}
                        className="bg-amber-500 hover:bg-amber-400 text-zinc-950"
                    >
                        {loading ? "Starting..." : "Start Run"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
