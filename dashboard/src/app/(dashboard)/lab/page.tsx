import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { IsometricOfficeWrapper } from "@/components/dashboard/isometric-office"
import { PageHeader } from "@/components/layout/page-header"

export default async function LabPage() {
    const session = await auth()
    if (!session) redirect("/login")

    return (
        <div className="space-y-8">
            <PageHeader title="Lab" subtitle="Experimental views and prototypes — isometric office, war room, and future experiments." />

            <div className="space-y-4">
                <h3 className="text-lg font-medium text-zinc-400">🏢 Isometric Office</h3>
                <IsometricOfficeWrapper />
            </div>
        </div>
    )
}
