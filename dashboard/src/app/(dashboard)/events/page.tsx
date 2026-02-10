import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/db"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { DataRefresh } from "@/components/data-refresh"

export default async function EventsPage() {
    const session = await auth()
    if (!session) redirect("/login")

    const events = await prisma.agent_events.findMany({
        orderBy: { created_at: 'desc' },
        take: 100
    })

    const serializedEvents = events.map((e: any) => ({
        ...e,
        id: Number(e.id),
        created_at: e.created_at?.toISOString() || new Date().toISOString(),
        cost_usd: Number(e.cost_usd),
    }))

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <DataRefresh />
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight text-white">Event Log</h2>
            </div>

            <ActivityFeed events={serializedEvents} />
        </div>
    )
}
