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
import { Star, ArrowUp, ArrowDown } from "lucide-react"
import { toast } from "sonner"

interface AgentActionsProps {
    agentId: string
    agentName: string
    currentLevel: number
}

export function AgentActions({ agentId, agentName, currentLevel }: AgentActionsProps) {
    const router = useRouter()
    const [promoteOpen, setPromoteOpen] = useState(false)
    const [demoteOpen, setDemoteOpen] = useState(false)
    const [reviewOpen, setReviewOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [feedback, setFeedback] = useState("")
    const [rating, setRating] = useState(3)
    const [outputSummary, setOutputSummary] = useState("")

    const handlePromote = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/agents/${agentId}/promote`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ feedback })
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || "Failed to promote agent")
            }

            toast.success(`${agentName} promoted to Level ${currentLevel + 1}!`)
            setPromoteOpen(false)
            setFeedback("")
            router.refresh()
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDemote = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/agents/${agentId}/demote`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ feedback })
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || "Failed to demote agent")
            }

            toast.error(`${agentName} demoted to Level ${currentLevel - 1}`)
            setDemoteOpen(false)
            setFeedback("")
            router.refresh()
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleReview = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/agents/${agentId}/review`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rating, feedback, output_summary: outputSummary })
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || "Failed to create review")
            }

            toast.success("Review added successfully")
            setReviewOpen(false)
            setFeedback("")
            setOutputSummary("")
            setRating(3)
            router.refresh()
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex gap-2">
            <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
                <DialogTrigger asChild>
                    <Button
                        variant="outline"
                        className="border-green-800 bg-green-950/30 text-green-400 hover:bg-green-900/40"
                        disabled={currentLevel >= 4}
                    >
                        <ArrowUp className="mr-2 h-4 w-4" />
                        Promote
                    </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-zinc-800">
                    <DialogHeader>
                        <DialogTitle className="text-white">Promote {agentName}</DialogTitle>
                        <DialogDescription>
                            Promote this agent from Level {currentLevel} to Level {currentLevel + 1}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="promote-feedback" className="text-zinc-400">
                                Feedback (optional)
                            </Label>
                            <Textarea
                                id="promote-feedback"
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="Why are you promoting this agent?"
                                className="bg-zinc-950 border-zinc-800 text-white"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setPromoteOpen(false)}
                            className="border-zinc-700 bg-zinc-900 text-zinc-300"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handlePromote}
                            disabled={loading}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {loading ? "Promoting..." : "Confirm Promotion"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={demoteOpen} onOpenChange={setDemoteOpen}>
                <DialogTrigger asChild>
                    <Button
                        variant="outline"
                        className="border-red-800 bg-red-950/30 text-red-400 hover:bg-red-900/40"
                        disabled={currentLevel <= 1}
                    >
                        <ArrowDown className="mr-2 h-4 w-4" />
                        Demote
                    </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-zinc-800">
                    <DialogHeader>
                        <DialogTitle className="text-white">Demote {agentName}</DialogTitle>
                        <DialogDescription>
                            Demote this agent from Level {currentLevel} to Level {currentLevel - 1}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="demote-feedback" className="text-zinc-400">
                                Feedback (required)
                            </Label>
                            <Textarea
                                id="demote-feedback"
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="Explain why this agent is being demoted"
                                className="bg-zinc-950 border-zinc-800 text-white"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDemoteOpen(false)}
                            className="border-zinc-700 bg-zinc-900 text-zinc-300"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDemote}
                            disabled={loading || !feedback.trim()}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {loading ? "Demoting..." : "Confirm Demotion"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
                <DialogTrigger asChild>
                    <Button
                        variant="outline"
                        className="border-amber-800 bg-amber-950/30 text-amber-400 hover:bg-amber-900/40"
                    >
                        <Star className="mr-2 h-4 w-4" />
                        Add Review
                    </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-zinc-800">
                    <DialogHeader>
                        <DialogTitle className="text-white">Review {agentName}</DialogTitle>
                        <DialogDescription>
                            Add a performance review for this agent.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label className="text-zinc-400 mb-2 block">Rating</Label>
                            <div className="flex gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setRating(i + 1)}
                                        className="focus:outline-none focus:ring-2 focus:ring-amber-500 rounded"
                                    >
                                        <Star
                                            className={`h-8 w-8 transition-colors ${
                                                i < rating
                                                    ? "text-amber-500 fill-amber-500"
                                                    : "text-zinc-700 hover:text-zinc-600"
                                            }`}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="output-summary" className="text-zinc-400">
                                Output Summary
                            </Label>
                            <Textarea
                                id="output-summary"
                                value={outputSummary}
                                onChange={(e) => setOutputSummary(e.target.value)}
                                placeholder="Brief summary of the work output"
                                className="bg-zinc-950 border-zinc-800 text-white"
                                rows={2}
                            />
                        </div>
                        <div>
                            <Label htmlFor="review-feedback" className="text-zinc-400">
                                Feedback
                            </Label>
                            <Textarea
                                id="review-feedback"
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="Detailed feedback on performance"
                                className="bg-zinc-950 border-zinc-800 text-white"
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setReviewOpen(false)}
                            className="border-zinc-700 bg-zinc-900 text-zinc-300"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleReview}
                            disabled={loading}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            {loading ? "Submitting..." : "Submit Review"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
