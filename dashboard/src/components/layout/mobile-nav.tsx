"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Play, Activity, Menu, Brain } from "lucide-react"
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
    { href: "/runs", label: "Runs", icon: Play },
    { href: "/events", label: "Events", icon: Activity },
    { href: "/memory", label: "Memory", icon: Brain },
]

const overflowItems = [
    { href: "/workflows", label: "Workflows" },
    { href: "/system", label: "System" },
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
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
}
