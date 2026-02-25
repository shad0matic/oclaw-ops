import { Suspense } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { pool } from "@/lib/drizzle"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { DataRefresh } from "@/components/data-refresh"
import { EventFilters } from "@/components/events/event-filters"
import { PageHeader } from "@/components/layout/page-header"

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ [key:string]: string | undefined }> }) {
    const session = await auth()
    if (!session) redirect("/login")

    const params = await searchParams
    const agentId = params.agent_id
    const eventType = params.event_type
    const dateFrom = params.date_from

    // Build where clause
    const conditions = []
    const values = []
    let paramIndex = 1

    if (agentId) {
        conditions.push(`agent_id = $${paramIndex++}`)
        values.push(agentId)
    }
    if (eventType) {
        conditions.push(`event_type ILIKE $${paramIndex++}`)
        values.push(`%${eventType}%`)
    }
    if (dateFrom) {
        conditions.push(`created_at >= $${paramIndex++}`)
        values.push(dateFrom)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

    const eventsQuery = `
        SELECT * FROM ops.agent_events 
        ${whereClause} 
        ORDER BY created_at DESC 
        LIMIT 100
    `
    
    const agentsQuery = `
        SELECT agent_id, name 
        FROM memory.agent_profiles 
        ORDER BY name ASC
    `

    const [eventsResult, agentsResult] = await Promise.all([
        pool.query(eventsQuery, values),
        pool.query(agentsQuery)
    ])

    const events = eventsResult.rows
    const agents = agentsResult.rows

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

            <Suspense fallback={<div className="text-zinc-500">Loading filters...</div>}>
                <EventFilters agents={agents} />
            </Suspense>

            <ActivityFeed events={serializedEvents} />
        </div>
    )
}
