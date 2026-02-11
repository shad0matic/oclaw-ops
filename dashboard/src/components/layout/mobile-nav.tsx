"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Activity, Menu, LogOut, ListTodo, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"

const topItems = [
    { href: "/", label: "Home", icon: LayoutDashboard },
    { href: "/agents", label: "Agents", icon: Users },
    { href: "/tasks", label: "Kanban", icon: ListTodo },
    { href: "/events", label: "Events", icon: Activity },
    { href: "/costs", label: "Costs", icon: DollarSign },
]

const overflowItems = [
    { href: "/settings", label: "Settings" },
]

export function MobileNav() {
    const pathname = usePathname()
    const [open, setOpen] = useState(false)

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-zinc-800 bg-zinc-950 px-2 pb-safe md:hidden">
            {topItems.map((item) => {
                const isActive = pathname === item.href
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center gap-1 rounded-lg p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
                            isActive ? "text-amber-500" : "text-zinc-500 hover:text-zinc-300"
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
                        className="flex flex-col items-center gap-1 rounded-lg p-2 text-zinc-500 hover:text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                        aria-label="More menu items"
                    >
                        <Menu className="h-5 w-5" />
                        <span className="text-[10px] font-medium">More</span>
                    </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="bg-zinc-900 border-zinc-800">
                    <SheetHeader>
                        <SheetTitle className="text-white">More Pages</SheetTitle>
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
                                        "block rounded-lg p-3 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
                                        isActive 
                                            ? "bg-amber-500/10 text-amber-500" 
                                            : "text-zinc-300 hover:bg-zinc-800"
                                    )}
                                >
                                    {item.label}
                                </Link>
                            )
                        })}
                        <div className="border-t border-zinc-800 pt-4 mt-4">
                            <div className="flex items-center justify-between px-3 py-2">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium text-zinc-400">BO</div>
                                    <div>
                                        <div className="text-sm font-medium text-white">Boss</div>
                                        <div className="text-xs text-zinc-500">Admin</div>
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
