"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Play, Activity } from "lucide-react"
import { cn } from "@/lib/utils"

const mobileItems = [
    { href: "/", label: "Home", icon: LayoutDashboard },
    { href: "/agents", label: "Agents", icon: Users },
    { href: "/runs", label: "Runs", icon: Play },
    { href: "/events", label: "Events", icon: Activity },
]

export function MobileNav() {
    const pathname = usePathname()

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-background px-4 pb-safe md:hidden">
            {mobileItems.map((item) => {
                const isActive = pathname === item.href
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center gap-1 rounded-lg p-2 transition-colors",
                            isActive ? "text-primary" : "text-muted-foreground"
                        )}
                    >
                        <item.icon className="h-5 w-5" />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </Link>
                )
            })}
        </div>
    )
}
