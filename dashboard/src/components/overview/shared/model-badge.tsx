"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface ModelBadgeProps {
  model: string | null
  size?: 'sm' | 'md'
  className?: string
}

const modelColors: Record<string, string> = {
  opus: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  sonnet: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  gemini: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30",
  grok: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
  flash: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
}

function getModelColor(model: string): string {
  const lower = model.toLowerCase()
  for (const [key, color] of Object.entries(modelColors)) {
    if (lower.includes(key)) return color
  }
  return "bg-muted text-muted-foreground border-border"
}

export function ModelBadge({ model, size = 'sm', className }: ModelBadgeProps) {
  if (!model) return null

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono",
        size === 'sm' && "text-xs px-1.5 py-0.5",
        size === 'md' && "text-sm px-2 py-1",
        getModelColor(model),
        className
      )}
    >
      {model}
    </Badge>
  )
}
