import { PageHeader } from "@/components/layout/page-header";
import CostsClientPage from "./costs-client";

export default function CostsPage() {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <PageHeader title="Cost Tracking" subtitle="API usage costs across providers — daily snapshots and spending trends." />
            </div>
            <CostsClientPage />
        </div>
    )
}
