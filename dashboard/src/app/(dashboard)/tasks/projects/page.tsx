
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import { ProjectsClient } from "./projects-client"

export default async function ProjectsPage() {
    const session = await auth()
    if (!session) redirect("/login")

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <PageHeader title="Projects" subtitle="Track long-running epics and their associated tasks." />
            </div>
            <ProjectsClient />
        </div>
    )
}
