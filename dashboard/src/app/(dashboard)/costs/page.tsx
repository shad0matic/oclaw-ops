import { PageHeader } from "@/components/layout/page-header";
import CostsClientPage from "./costs-client";

export default function CostsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="Costs 💰" 
          subtitle="Per-agent cost tracking, budget enforcement, and spend reporting."
        />
      </div>
      <CostsClientPage />
    </div>
  )
}
