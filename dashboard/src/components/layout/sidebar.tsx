import Link from "next/link"

import { LayoutDashboard, Users, GitGraph, Play, Brain, Activity, Server, LogOut, ListTodo, FlaskConical } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { signOut } from "@/auth"
import { NavLinks } from "./nav-links"
import { ThemeToggle } from "@/components/theme-toggle"

const navItems = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/lab", label: "The Lab", icon: FlaskConical },
    { href: "/agents", label: "Agents", icon: Users },
    { href: "/workflows", label: "Workflows", icon: GitGraph },
    { href: "/tasks", label: "Tasks", icon: ListTodo },
    { href: "/runs", label: "Runs", icon: Play },
    { href: "/memory", label: "Memory", icon: Brain },
    { href: "/events", label: "Events", icon: Activity },
    { href: "/system", label: "System", icon: Server },
]

export function Sidebar({ className }: { className?: string }) {
    return (
        <div className={cn("flex h-full w-64 flex-col border-r bg-sidebar text-sidebar-foreground", className)}>
            <div className="flex h-16 items-center justify-between border-b px-6">
                <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Pump Bold', sans-serif", color: '#FFD700' }}>{process.env.NEXT_PUBLIC_DASHBOARD_NAME || "Minions Control"}</span>
                <ThemeToggle />
            </div>
            <div className="flex-1 overflow-auto py-4">
                <nav className="grid gap-1 px-2">
                    <NavLinks />
                </nav>
            </div>
            <div className="border-t p-4">
                <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 p-3">
                    <Avatar>
                        <AvatarImage src="/avatar.svg" />
                        <AvatarFallback>BO</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-1 flex-col truncate">
                        <span className="text-sm font-medium">Boss</span>
                        <span className="text-xs text-muted-foreground">Admin</span>
                    </div>
                    <form
                        action={async () => {
                            "use server"
                            await signOut()
                        }}
                    >
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    )
}
