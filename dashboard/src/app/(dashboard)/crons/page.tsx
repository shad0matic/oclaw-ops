import {CronClient} from '@/components/crons/cron-client'
import {PageHeader} from '@/components/layout/page-header'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'

export default function CronPage() {
	return (
		<div className="space-y-6">
			<PageHeader
				title="Cron Jobs"
				subtitle="Schedule and manage automated tasks for your agents."
			/>
			<Card>
				<CardHeader>
					<CardTitle>Job Management</CardTitle>
					<CardDescription>
						Create, edit, and monitor scheduled cron jobs. Jobs can run at specific times,
						intervals, or using cron expressions.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<CronClient />
				</CardContent>
			</Card>
		</div>
	)
}
