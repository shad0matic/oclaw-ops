"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { RefreshCw, XCircle } from "lucide-react"
import { toast } from "sonner"

interface RunActionsProps {
    runId: string
    workflowId: number | null
    status: string
    task: string | null
}

export function RunActions({ runId, workflowId, status, task }: RunActionsProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const handleCancel = async () => {
        setLoading(true)
        try {
            // This would call an API to update the run status
            // For now, we'll just show a toast as the backend logic isn't specified
            toast.info("Cancel functionality requires backend integration")
            
            // Example implementation:
            // const res = await fetch(`/api/runs/${runId}/cancel`, { method: "POST" })
            // if (!res.ok) throw new Error("Failed to cancel run")
            // toast.success("Run cancelled")
            // router.refresh()
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleRetry = async () => {
        if (!workflowId) {
            toast.error("Cannot retry: workflow ID not found")
            return
        }

        setLoading(true)
        try {
            // Trigger a new run with the same workflow and task
            const res = await fetch(`/api/workflows/${workflowId}/run`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    task: task || "Retry of previous run",
                    context: {}
                })
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || "Failed to retry run")
            }

            const newRun = await res.json()
            toast.success("Run triggered successfully")
            router.push(`/runs/${newRun.id}`)
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex gap-2">
            {status === 'running' && (
                <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleCancel}
                    disabled={loading}
                >
                    <XCircle className="mr-2 h-3 w-3" />
                    {loading ? "Cancelling..." : "Cancel Run"}
                </Button>
            )}
            {(status === 'failed' || status === 'error') && (
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                    onClick={handleRetry}
                    disabled={loading}
                >
                    <RefreshCw className="mr-2 h-3 w-3" />
                    {loading ? "Retrying..." : "Retry"}
                </Button>
            )}
        </div>
    )
}
