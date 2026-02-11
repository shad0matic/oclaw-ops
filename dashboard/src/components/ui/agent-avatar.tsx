"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface AgentAvatarProps {
    agentId: string
    fallbackText?: string
    className?: string
}

export function AgentAvatar({ agentId, fallbackText, className }: AgentAvatarProps) {
    const [src, setSrc] = useState(`/assets/minion-avatars/${agentId}.webp`)

    return (
        <Avatar className={cn("border border-zinc-700", className)}>
            <AvatarImage
                src={src}
                onError={() => setSrc("/assets/minion-avatars/default.webp")}
            />
            <AvatarFallback>{fallbackText || agentId.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
    )
}
