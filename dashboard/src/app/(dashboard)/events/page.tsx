import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/db"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { DataRefresh } from "@/components/data-refresh"
import { EventFilters } from "@/components/events/event-filters"
import { Prisma } from "@/generated/prisma/client"
import { PageHeader } from "@/components/layout/page-header"

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
    const session = await auth()
    if (!session) redirect("/login")

    const params = await searchParams
    const agentId = params.agent_id
    const eventType = params.event_type
    const dateFrom = params.date_from

    // Build where clause
    const where: Prisma.agent_eventsWhereInput = {}
    if (agentId) where.agent_id = agentId
    if (eventType) where.event_type = { contains: eventType, mode: 'insensitive' }
    if (dateFrom) {
        where.created_at = {
            gte: new Date(dateFrom)
        }
    }

    const [events, agents] = await Promise.all([
        prisma.agent_events.findMany({
            where,
            orderBy: { created_at: 'desc' },
            take: 100
        }),
        prisma.agent_profiles.findMany({
            select: { agent_id: true, name: true },
            orderBy: { name: 'asc' }
        })
    ])

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
                <PageHeader title="Event Log" subtitle="Full activity timeline — every task, error, commit, and heartbeat across all agents." />
            </div>

            <EventFilters agents={agents} />

            <ActivityFeed events={serializedEvents} />
        </div>
    )
}
