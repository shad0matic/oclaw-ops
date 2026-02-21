import { redirect } from "next/navigation"
import { SystemMonitor } from "@/components/dashboard/system-monitor"
import { TelegramSessions } from "@/components/telegram/telegram-sessions"
import { getCpuLoad, getMemStats, getUptime } from "@/lib/system-stats"
import { PageHeader } from "@/components/layout/page-header"

export default async function SystemPage() {
    let initialData = undefined
    try {
        const cpuLoad = getCpuLoad()
        const mem = getMemStats()
        const uptime = getUptime()
        initialData = {
            cpu: { usage: cpuLoad },
            memory: { total: mem.total, used: mem.active, free: mem.total - mem.active },
            uptime
        }
    } catch (e) {
        console.error("System page fetch error", e)
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <PageHeader title="System Status" subtitle="VPS health — CPU, memory, disk, uptime, and service status." />
            </div>

            <SystemMonitor initialData={initialData} />

            <TelegramSessions />
        </div>
    )
}
