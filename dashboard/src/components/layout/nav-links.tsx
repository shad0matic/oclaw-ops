"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import {
    LayoutDashboard,
    Users,
    GitGraph,
    Play,
    Brain,
    Activity,
    Server,
    AlertTriangle,
    Network,
    AlertCircle,
    Zap,
    DollarSign,
    Layers,
    Settings,
    ListTodo,
    FlaskConical,
    Bookmark,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Minimal navigation (keep advanced pages accessible by URL, but hidden from sidebar)
// Visible for now: Overview, Agents, Kanban, Events, Runs, Settings
const navItems = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/lab", label: "Lab", icon: FlaskConical },
    { href: "/tasks", label: "Kanban", icon: ListTodo },
    { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
    { href: "/knowledge", label: "Knowledge", icon: Brain },
    { href: "/costs", label: "Costs", icon: DollarSign },
    { href: "/agents", label: "Agents", icon: Users },
    { href: "/runs", label: "Runs", icon: Play },
    { href: "/events", label: "Events", icon: Activity },
    { href: "/settings", label: "Settings", icon: Settings },
]

// Hidden (for later): workflows, memory, system, priorities, knowledge, mistakes, reactions, costs, compounds

export function NavLinks() {
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const hasRunFilters = searchParams.has("status") || searchParams.has("workflow_id") || searchParams.has("agent_id")

    return (
        <>
            {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                const isRunsLink = item.href === "/runs"
                const shouldGlow = isRunsLink && hasRunFilters

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                            isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground",
                            shouldGlow && "shadow-[0_0_12px_1px_rgba(255,215,0,0.4)]"
                        )}
                        aria-label={`Navigate to ${item.label}`}
                        aria-current={isActive ? "page" : undefined}
                    >
                        <item.icon className="h-4 w-4" aria-hidden="true" />
                        {item.label}
                    </Link>
                )
            })}
        </>
    )
}
