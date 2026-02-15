
'use client'

import {useState} from 'react'
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import {CronJob, CronRun} from '@/lib/types/cron'
import {columns} from './cron-columns'
import {DataTable} from '@/components/ui/data-table'
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert'
import {Terminal} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import {ScrollArea} from '@/components/ui/scroll-area'
import {Badge} from '@/components/ui/badge'
import {formatDistanceToNow} from 'date-fns'

async function fetchCronJobs(): Promise<CronJob[]> {
	const res = await fetch('/api/cron/jobs')
	if (!res.ok) {
		throw new Error('Network response was not ok')
	}
	return res.json()
}

async function fetchCronRuns(jobId: string): Promise<CronRun[]> {
	const res = await fetch(`/api/cron/jobs/${jobId}/runs`)
	if (!res.ok) {
		throw new Error('Network response was not ok')
	}
	const runs = await res.json()
	return runs.sort(
		(a: CronRun, b: CronRun) =>
			new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
	)
}

function RunHistoryDialog({
	job,
	isOpen,
	onClose,
}: {
	job: CronJob
	isOpen: boolean
	onClose: () => void
}) {
	const {
		data: runs,
		isLoading,
		error,
	} = useQuery<CronRun[], Error>({
		queryKey: ['cronRuns', job.id],
		queryFn: () => fetchCronRuns(job.id),
		enabled: isOpen,
	})

	const getBadgeVariant = (status: CronRun['status']) => {
		switch (status) {
			case 'succeeded':
				return 'success'
			case 'failed':
				return 'destructive'
			case 'running':
				return 'default'
			default:
				return 'secondary'
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-4xl">
				<DialogHeader>
					<DialogTitle>Run History: {job.name}</DialogTitle>
				</DialogHeader>
				<ScrollArea className="h-[60vh] pr-4">
					{isLoading && <p>Loading run history...</p>}
					{error && (
						<Alert variant="destructive">
							<Terminal className="h-4 w-4" />
							<AlertTitle>Error</AlertTitle>
							<AlertDescription>{error.message}</AlertDescription>
						</Alert>
					)}
					{runs && runs.length > 0 ? (
						<div className="space-y-4">
							{runs.map(run => (
								<div key={run.id} className="rounded-lg border p-4">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-4">
											<Badge variant={getBadgeVariant(run.status)}>
												{run.status}
											</Badge>
											<p className="text-sm text-muted-foreground">
												{formatDistanceToNow(new Date(run.started_at), {
													addSuffix: true,
												})}
											</p>
										</div>
										<p className="text-sm text-muted-foreground">
											Duration: {run.duration_ms}ms
										</p>
									</div>
									{run.log && (
										<pre className="mt-4 w-full overflow-auto rounded-md bg-secondary p-2 text-xs text-secondary-foreground">
											<code>{run.log}</code>
										</pre>
									)}
								</div>
							))}
						</div>
					) : (
						<p>No run history found for this job.</p>
					)}
				</ScrollArea>
			</DialogContent>
		</Dialog>
	)
}

export function CronClient() {
	const [selectedJob, setSelectedJob] = useState<CronJob | null>(null)

	const {
		data: jobs,
		isLoading,
		error,
	} = useQuery<CronJob[], Error>({
		queryKey: ['cronJobs'],
		queryFn: fetchCronJobs,
	})

	const queryClient = useQueryClient()

	const toggleJobMutation = useMutation({
		mutationFn: ({id, enabled}: {id: string; enabled: boolean}) =>
			fetch(`/api/cron/jobs/${id}`, {
				method: 'PATCH',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({enabled}),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({queryKey: ['cronJobs']})
		},
	})

	const runJobMutation = useMutation({
		mutationFn: (id: string) =>
			fetch(`/api/cron/jobs/${id}/run`, {method: 'POST'}),
		onSuccess: (_, id) => {
			// Give it a moment for the run to show up
			setTimeout(
				() => queryClient.invalidateQueries({queryKey: ['cronRuns', id]}),
				1000,
			)
			setTimeout(
				() => queryClient.invalidateQueries({queryKey: ['cronJobs']}),
				1000,
			)
		},
	})

	const handleShowHistory = (job: CronJob) => {
		setSelectedJob(job)
	}

	const handleCloseHistory = () => {
		setSelectedJob(null)
	}

	if (isLoading) return <div>Loading...</div>
	if (error)
		return (
			<Alert variant="destructive">
				<Terminal className="h-4 w-4" />
				<AlertTitle>Error loading cron jobs</AlertTitle>
				<AlertDescription>{error.message}</AlertDescription>
			</Alert>
		)

	const cronColumns = columns({
		onToggle: toggleJobMutation.mutate,
		onRun: runJobMutation.mutate,
		onShowHistory: handleShowHistory,
	})

	return (
		<div>
			<DataTable columns={cronColumns} data={jobs || []} />
			{selectedJob && (
				<RunHistoryDialog
					job={selectedJob}
					isOpen={!!selectedJob}
					onClose={handleCloseHistory}
				/>
			)}
		</div>
	)
}
