"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface ModelDisplayEntry {
    id: string          // e.g. "anthropic/claude-opus-4-6"
    label: string       // e.g. "Opus"
    color: string       // hex color
    icon: string        // emoji
    warnThreshold: number // estimated cost warning threshold in €
}

const DEFAULT_MODELS: ModelDisplayEntry[] = [
    { id: "anthropic/claude-opus-4-6", label: "Opus", color: "#ef4444", icon: "🔴", warnThreshold: 0.50 },
    { id: "google/gemini-2.5-pro", label: "Gemini", color: "#22c55e", icon: "🟢", warnThreshold: 2.00 },
    { id: "xai/grok-3", label: "Grok", color: "#f59e0b", icon: "🟡", warnThreshold: 1.00 },
    { id: "openai/gpt-5.2", label: "GPT", color: "#3b82f6", icon: "🔵", warnThreshold: 1.00 },
    { id: "xai/grok-4-fast", label: "Grok4", color: "#f97316", icon: "🟠", warnThreshold: 1.50 },
    { id: "xai/grok-4.1-fast", label: "Grok4.1", color: "#f97316", icon: "🟠", warnThreshold: 1.50 },
    { id: "anthropic/claude-sonnet-4-5", label: "Sonnet", color: "#a855f7", icon: "🟣", warnThreshold: 0.30 },
]

const STORAGE_KEY = "model-display-config"

export function getModelConfig(): ModelDisplayEntry[] {
    if (typeof window === "undefined") return DEFAULT_MODELS
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) return JSON.parse(stored)
    } catch {}
    return DEFAULT_MODELS
}

export function getModelEntry(modelId?: string): ModelDisplayEntry | null {
    if (!modelId) return null
    const config = getModelConfig()
    return config.find(m => m.id === modelId) || null
}

export function ModelDisplayConfig() {
    const [models, setModels] = useState<ModelDisplayEntry[]>(DEFAULT_MODELS)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        setModels(getModelConfig())
    }, [])

    function updateModel(idx: number, field: keyof ModelDisplayEntry, value: string | number) {
        setModels(prev => {
            const next = [...prev]
            next[idx] = { ...next[idx], [field]: value }
            return next
        })
        setSaved(false)
    }

    function save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(models))
        setSaved(true)
        // Dispatch event so ModelChip components can re-read
        window.dispatchEvent(new Event("model-config-changed"))
        setTimeout(() => setSaved(false), 2000)
    }

    function reset() {
        setModels(DEFAULT_MODELS)
        localStorage.removeItem(STORAGE_KEY)
        window.dispatchEvent(new Event("model-config-changed"))
    }

    return (
        <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
                <CardTitle className="text-zinc-400 text-base">Model Display & Cost Warnings</CardTitle>
                <p className="text-xs text-zinc-500">Customize how each model appears in the activity feed. Set colors to spot expensive models at a glance.</p>
            </CardHeader>
            <CardContent className="space-y-4">
                {models.map((model, idx) => (
                    <div key={model.id} className="flex items-center gap-3 flex-wrap">
                        {/* Preview chip */}
                        <Badge
                            className="text-[10px] px-1.5 py-0.5 font-mono border shrink-0"
                            style={{
                                backgroundColor: `${model.color}15`,
                                color: model.color,
                                borderColor: `${model.color}40`,
                            }}
                        >
                            {model.icon} {model.label}
                        </Badge>

                        {/* Model ID (read-only) */}
                        <span className="text-[10px] text-zinc-600 font-mono w-48 truncate shrink-0">{model.id}</span>

                        {/* Label */}
                        <div className="flex items-center gap-1">
                            <Label className="text-[10px] text-zinc-500">Label</Label>
                            <Input
                                value={model.label}
                                onChange={e => updateModel(idx, "label", e.target.value)}
                                className="h-7 w-20 text-xs bg-zinc-950 border-zinc-800"
                            />
                        </div>

                        {/* Icon */}
                        <div className="flex items-center gap-1">
                            <Label className="text-[10px] text-zinc-500">Icon</Label>
                            <Input
                                value={model.icon}
                                onChange={e => updateModel(idx, "icon", e.target.value)}
                                className="h-7 w-12 text-xs bg-zinc-950 border-zinc-800 text-center"
                            />
                        </div>

                        {/* Color */}
                        <div className="flex items-center gap-1">
                            <Label className="text-[10px] text-zinc-500">Color</Label>
                            <input
                                type="color"
                                value={model.color}
                                onChange={e => updateModel(idx, "color", e.target.value)}
                                className="h-7 w-8 rounded border border-zinc-800 bg-zinc-950 cursor-pointer"
                            />
                        </div>

                        {/* Warn threshold */}
                        <div className="flex items-center gap-1">
                            <Label className="text-[10px] text-zinc-500">Warn €&gt;</Label>
                            <Input
                                type="number"
                                step="0.10"
                                min="0"
                                value={model.warnThreshold}
                                onChange={e => updateModel(idx, "warnThreshold", parseFloat(e.target.value) || 0)}
                                className="h-7 w-16 text-xs bg-zinc-950 border-zinc-800"
                            />
                        </div>
                    </div>
                ))}

                <div className="flex gap-2 pt-2">
                    <Button onClick={save} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                        {saved ? "✓ Saved" : "Save"}
                    </Button>
                    <Button onClick={reset} variant="outline" size="sm" className="border-zinc-700 text-zinc-400 hover:bg-zinc-800">
                        Reset to defaults
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
