
import {CronClient} from '@/components/crons/cron-client'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'

export default function CronPage() {
	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-bold">Cron Jobs</h1>
			<Card>
				<CardHeader>
					<CardTitle>Job Management</CardTitle>
					<CardDescription>
						Monitor and manage scheduled cron jobs.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<CronClient />
				</CardContent>
			</Card>
		</div>
	)
}
