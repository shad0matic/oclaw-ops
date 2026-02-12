import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Overview } from "@/components/overview"

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return <Overview />
}
