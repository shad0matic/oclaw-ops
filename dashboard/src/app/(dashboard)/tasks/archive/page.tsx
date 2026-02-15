import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { ArchiveClient } from "./archive-client"

export default async function ArchivePage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="space-y-6">
      <ArchiveClient />
    </div>
  )
}
