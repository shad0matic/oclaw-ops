"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, GitGraph, Play, Brain, Activity, Server } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/agents", label: "Agents", icon: Users },
    { href: "/workflows", label: "Workflows", icon: GitGraph },
    { href: "/runs", label: "Runs", icon: Play },
    { href: "/memory", label: "Memory", icon: Brain },
    { href: "/events", label: "Events", icon: Activity },
    { href: "/system", label: "System", icon: Server },
]

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
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground"
                        )}
                    >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                    </Link>
                )
            })}
        </>
    )
}
