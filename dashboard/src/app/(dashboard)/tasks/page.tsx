// @ts-nocheck
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { TaskQueueClient } from "@/components/tasks/task-queue-client"

export default async function TasksPage() {
    const session = await auth()
    if (!session) redirect("/login")

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight text-white">Task Queue</h2>
            </div>
            <TaskQueueClient />
        </div>
    )
}
