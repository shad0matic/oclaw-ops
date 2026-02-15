
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import { ProjectDetailClient } from "./project-detail-client"
import { notFound } from "next/navigation"

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await auth()
  if (!session) redirect("/login")

  if (!params.id) {
    notFound()
  }

  return (
    <div className="space-y-8">
      <ProjectDetailClient projectId={params.id} />
    </div>
  )
}
