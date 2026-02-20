import { PageHeader } from "@/components/layout/page-header";
import DaveClientPage from "./dave-client";

export default function DavePage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="Dave — Cost Accountant 💰" 
          subtitle="Per-agent cost tracking, budget enforcement, and spend reporting across all services."
        />
      </div>
      <DaveClientPage />
    </div>
  )
}
