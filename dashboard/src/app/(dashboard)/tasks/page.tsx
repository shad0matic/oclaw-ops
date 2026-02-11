// @ts-nocheck
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { TaskQueueClient } from "@/components/tasks/task-queue-client"
import { PageHeader } from "@/components/layout/page-header"

export default async function TasksPage() {
    const session = await auth()
    if (!session) redirect("/login")

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <PageHeader title="Task Queue" subtitle="Active and pending tasks assigned to agents — track progress in real time." />
            </div>
            <TaskQueueClient />
        </div>
    )
}
