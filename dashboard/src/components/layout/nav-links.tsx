"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, GitGraph, Play, Brain, Activity, Server, AlertTriangle, Network, AlertCircle, Zap, DollarSign, Layers, Settings, ListTodo } from "lucide-react"
import { cn } from "@/lib/utils"

// Minimal navigation (keep advanced pages accessible by URL, but hidden from sidebar)
// Visible for now: Overview, Agents, Kanban, Events, Runs, Settings
const navItems = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/agents", label: "Agents", icon: Users },
    { href: "/tasks", label: "Kanban", icon: ListTodo },
    { href: "/events", label: "Events", icon: Activity },
    { href: "/runs", label: "Runs", icon: Play },
    { href: "/settings", label: "Settings", icon: Settings },
]

// Hidden (for later): workflows, memory, system, priorities, knowledge, mistakes, reactions, costs, compounds

export function NavLinks() {
    const pathname = usePathname()

    return (
        <>
            {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                            isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground"
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
