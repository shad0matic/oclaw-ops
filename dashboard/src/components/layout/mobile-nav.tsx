"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { LayoutDashboard, Users, Activity, Menu, LogOut, ListTodo, DollarSign, FlaskConical, Settings, Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"

const topItems = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/lab", label: "Lab", icon: FlaskConical },
    { href: "/tasks", label: "Kanban", icon: ListTodo },
    { href: "/costs", label: "Costs", icon: DollarSign },
]

const overflowItems = [
    { href: "/agents", label: "Agents", icon: Users },
    { href: "/events", label: "Events", icon: Activity },
    { href: "/settings", label: "Settings", icon: Settings },
]

export function MobileNav() {
    const pathname = usePathname()
    const [open, setOpen] = useState(false)
    const { theme, setTheme } = useTheme()

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-background px-2 pb-safe md:hidden">
            {topItems.map((item) => {
                const isActive = pathname === item.href
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center gap-1 rounded-lg p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
                            isActive ? "text-amber-500" : "text-muted-foreground/70 hover:text-foreground/80"
                        )}
                        aria-label={item.label}
                        aria-current={isActive ? "page" : undefined}
                    >
                        <item.icon className="h-5 w-5" />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </Link>
                )
            })}
            
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <button
                        className="flex flex-col items-center gap-1 rounded-lg p-2 text-muted-foreground/70 hover:text-foreground/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                        aria-label="More menu items"
                    >
                        <Menu className="h-5 w-5" />
                        <span className="text-[10px] font-medium">More</span>
                    </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="bg-card border-border">
                    <SheetHeader>
                        <SheetTitle className="text-foreground">More Pages</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 space-y-2">
                        {overflowItems.map((item) => {
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg p-3 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
                                        isActive 
                                            ? "bg-amber-500/10 text-amber-500" 
                                            : "text-foreground/80 hover:bg-muted"
                                    )}
                                >
                                    <item.icon className="h-5 w-5" />
                                    {item.label}
                                </Link>
                            )
                        })}
                        <div className="border-t border-border pt-4 mt-4">
                            <button
                                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                className="flex items-center gap-3 rounded-lg p-3 w-full text-base font-medium text-foreground/80 hover:bg-muted transition-colors"
                            >
                                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                                {theme === "dark" ? "Light Mode" : "Dark Mode"}
                            </button>
                            <div className="flex items-center justify-between px-3 py-2 mt-2">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">BO</div>
                                    <div>
                                        <div className="text-sm font-medium text-foreground">Boss</div>
                                        <div className="text-xs text-muted-foreground/70">Admin</div>
                                    </div>
                                </div>
                                <form action="/api/auth/signout" method="POST">
                                    <button
                                        type="submit"
                                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Logout
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
}
