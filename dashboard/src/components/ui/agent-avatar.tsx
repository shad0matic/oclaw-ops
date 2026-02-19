"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { AgentEntity } from "@/entities/agent"

interface AgentAvatarProps {
    agentId: string
    fallbackText?: string
    className?: string
    size?: number
}

export function AgentAvatar({ agentId, fallbackText, className, size }: AgentAvatarProps) {
    const [src, setSrc] = useState(AgentEntity.avatarUrl(agentId))

    return (
        <Avatar className={cn("border border-border", className)} style={size ? { width: size, height: size } : undefined}>
            <AvatarImage
                src={src}
                onError={() => setSrc("/assets/minion-avatars/default.webp")}
            />
            <AvatarFallback>{fallbackText || (agentId ? agentId.substring(0, 2).toUpperCase() : "??")}</AvatarFallback>
        </Avatar>
    )
}
