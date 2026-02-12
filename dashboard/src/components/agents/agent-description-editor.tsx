"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Pencil, Check, X } from "lucide-react"

export function AgentDescriptionEditor({ agentId, initialDescription }: { agentId: string, initialDescription: string }) {
    const [editing, setEditing] = useState(false)
    const [description, setDescription] = useState(initialDescription)
    const [saving, setSaving] = useState(false)

    async function save() {
        setSaving(true)
        try {
            const res = await fetch(`/api/agents/${agentId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ description })
            })
            if (res.ok) setEditing(false)
        } finally {
            setSaving(false)
        }
    }

    if (!editing) {
        return (
            <div className="flex items-center gap-2">
                <div className="text-foreground p-2 bg-background rounded border border-border flex-1 min-h-[40px]">
                    {description || <span className="text-muted-foreground italic">No description</span>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => setEditing(true)}>
                    <Pencil className="h-4 w-4" />
                </Button>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-2">
            <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex-1 p-2 bg-background rounded border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setDescription(initialDescription); setEditing(false); } }}
            />
            <Button variant="ghost" size="icon" onClick={save} disabled={saving}>
                <Check className="h-4 w-4 text-green-500" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => { setDescription(initialDescription); setEditing(false); }}>
                <X className="h-4 w-4 text-red-500" />
            </Button>
        </div>
    )
}
