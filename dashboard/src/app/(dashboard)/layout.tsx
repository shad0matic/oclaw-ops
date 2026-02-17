import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { GlobalStatusBar } from "@/components/layout/global-status-bar";
import Providers from "../providers";
import { CommandPalette } from "@/components/layout/command-palette";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <Providers>
            <CommandPalette />
            <div className="flex h-screen bg-background">
                <aside className="hidden md:block">
                    <Sidebar className="h-full" />
                </aside>

                <div className="flex flex-1 flex-col overflow-hidden">
                    <div className="hidden items-center justify-between md:flex">
                        <GlobalStatusBar />
                        <div className="mr-4 text-sm text-muted-foreground">
                            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                <span className="text-xs">⌘</span>K
                            </kbd>
                        </div>
                    </div>
                    <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-8 md:pb-8">
                        {children}
                    </main>
                </div>

                <MobileNav />
            </div>
        </Providers>
    );
}
