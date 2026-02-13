import { Sidebar } from "@/components/layout/sidebar"
import { MobileNav } from "@/components/layout/mobile-nav"
import { GlobalStatusBar } from "@/components/layout/global-status-bar"
import Providers from "../providers"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <Providers>
            <div className="flex h-screen bg-background">
                <aside className="hidden md:block">
                    <Sidebar className="h-full" />
                </aside>

                <div className="flex flex-1 flex-col overflow-hidden">
                    <div className="hidden md:block">
                        <GlobalStatusBar />
                    </div>
                    <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-8 md:pb-8">
                        {children}
                    </main>
                </div>

                <MobileNav />
            </div>
        </Providers>
    )
}
