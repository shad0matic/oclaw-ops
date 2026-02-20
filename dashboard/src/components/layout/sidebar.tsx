import { LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { signOut } from "@/auth"
import { NavLinks } from "./nav-links"
import { ThemeToggle } from "@/components/theme-toggle"
import { ResearchToggle } from "@/components/overview/desktop/research-toggle"

export function Sidebar({ className }: { className?: string }) {
    return (
        <div className={cn("flex h-full w-52 flex-col border-r bg-sidebar text-sidebar-foreground", className)}>
            <div className="flex h-14 items-center justify-between border-b px-4">
                <span className="text-lg font-bold tracking-tight truncate" style={{ fontFamily: "'Pump Bold', sans-serif", color: '#FFD700' }}>{process.env.NEXT_PUBLIC_DASHBOARD_NAME || "MC"}</span>
                <ThemeToggle />
            </div>
            <div className="flex-1 overflow-auto py-4">
                <nav className="grid gap-1 px-2">
                    <NavLinks />
                </nav>
            </div>
            <div className="border-t px-3 py-2">
                <ResearchToggle />
            </div>
            <div className="border-t p-3">
                <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/50 p-2">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src="/avatar.svg" />
                        <AvatarFallback className="text-xs">BO</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-1 flex-col truncate">
                        <span className="text-sm font-medium">Boss</span>
                    </div>
                    <form
                        action={async () => {
                            "use server"
                            await signOut()
                        }}
                    >
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                            <LogOut className="h-3.5 w-3.5" />
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    )
}
