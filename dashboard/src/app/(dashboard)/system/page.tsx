import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { SystemMonitor } from "@/components/dashboard/system-monitor"
import si from "systeminformation"
import { PageHeader } from "@/components/layout/page-header"

export default async function SystemPage() {
    const session = await auth()
    if (!session) redirect("/login")

    let initialData = undefined
    try {
        const [load, mem, time] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.time()
        ])
        initialData = {
            cpu: { usage: load.currentLoad },
            memory: { total: mem.total, used: mem.active, free: mem.available },
            uptime: time.uptime
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
        </div>
    )
}
