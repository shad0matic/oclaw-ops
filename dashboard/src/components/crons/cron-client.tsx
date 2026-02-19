'use client'

import {useState} from 'react'
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import {CronJob, CronRun, CronJobFormData} from '@/lib/types/cron'
import {columns} from './cron-columns'
import {CronJobDialog} from './cron-job-dialog'
import {DeleteJobDialog} from './delete-job-dialog'
import {DataTable} from '@/components/ui/data-table'
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert'
import {Terminal, Plus, Trash2, Play, Pause} from 'lucide-react'
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
import {toast} from 'sonner'

async function fetchCronJobs(): Promise<CronJob[]> {
	const res = await fetch('/api/cron/jobs')
	if (!res.ok) {
		throw new Error('Failed to fetch cron jobs')
	}
	return res.json()
}

async function fetchCronRuns(jobId: string): Promise<CronRun[]> {
	const res = await fetch(`/api/cron/jobs/${jobId}/runs`)
	if (!res.ok) {
		throw new Error('Failed to fetch run history')
	}
	const runs = await res.json()
	return runs.sort(
		(a: CronRun, b: CronRun) =>
			new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
	)
}

async function createCronJob(data: CronJobFormData): Promise<CronJob> {
	const res = await fetch('/api/cron/jobs', {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({
			name: data.name,
			kind: data.kind,
			schedule: data.schedule,
			timezone: data.timezone,
			sessionTarget: data.session_target,
			payload: {
				type: 'agentTurn',
				message: data.prompt,
				model: data.model,
			},
			enabled: data.enabled,
		}),
	})
	if (!res.ok) {
		const error = await res.text()
		throw new Error(error || 'Failed to create job')
	}
	return res.json()
}

async function updateCronJob(id: string, data: Partial<CronJobFormData>): Promise<CronJob> {
	const body: Record<string, unknown> = {}
	
	if (data.name !== undefined) body.name = data.name
	if (data.kind !== undefined) body.kind = data.kind
	if (data.schedule !== undefined) body.schedule = data.schedule
	if (data.timezone !== undefined) body.timezone = data.timezone
	if (data.session_target !== undefined) body.sessionTarget = data.session_target
	if (data.enabled !== undefined) body.enabled = data.enabled
	if (data.prompt !== undefined || data.model !== undefined) {
		body.payload = {
			type: 'agentTurn',
			message: data.prompt,
			model: data.model,
		}
	}
	
	const res = await fetch(`/api/cron/jobs/${id}`, {
		method: 'PATCH',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify(body),
	})
	if (!res.ok) {
		const error = await res.text()
		throw new Error(error || 'Failed to update job')
	}
	return res.json()
}

async function deleteCronJob(id: string): Promise<void> {
	const res = await fetch(`/api/cron/jobs/${id}`, {
		method: 'DELETE',
	})
	if (!res.ok) {
		const error = await res.text()
		throw new Error(error || 'Failed to delete job')
	}
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
						!isLoading && <p className="text-muted-foreground">No run history found for this job.</p>
					)}
				</ScrollArea>
			</DialogContent>
		</Dialog>
	)
}

export function CronClient() {
	const [selectedJob, setSelectedJob] = useState<CronJob | null>(null)
	const [editingJob, setEditingJob] = useState<CronJob | null>(null)
	const [deletingJob, setDeletingJob] = useState<CronJob | null>(null)
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
	const [runningJobId, setRunningJobId] = useState<string | null>(null)
	const [selectedRows, setSelectedRows] = useState<CronJob[]>([])

	const queryClient = useQueryClient()

	const {
		data: jobs,
		isLoading,
		error,
	} = useQuery<CronJob[], Error>({
		queryKey: ['cronJobs'],
		queryFn: fetchCronJobs,
	})

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
		onError: (error: Error) => {
			toast.error('Failed to toggle job', {description: error.message})
		},
	})

	const runJobMutation = useMutation({
		mutationFn: async (id: string) => {
			setRunningJobId(id)
			const res = await fetch(`/api/cron/jobs/${id}/run`, {method: 'POST'})
			if (!res.ok) throw new Error('Failed to trigger job')
			return res
		},
		onSuccess: (_, id) => {
			toast.success('Job triggered successfully')
			// Give it a moment for the run to show up
			setTimeout(() => {
				queryClient.invalidateQueries({queryKey: ['cronRuns', id]})
				queryClient.invalidateQueries({queryKey: ['cronJobs']})
				setRunningJobId(null)
			}, 2000)
		},
		onError: (error: Error) => {
			toast.error('Failed to trigger job', {description: error.message})
			setRunningJobId(null)
		},
	})

	const createJobMutation = useMutation({
		mutationFn: createCronJob,
		onSuccess: () => {
			toast.success('Job created successfully')
			queryClient.invalidateQueries({queryKey: ['cronJobs']})
			setIsCreateDialogOpen(false)
		},
		onError: (error: Error) => {
			toast.error('Failed to create job', {description: error.message})
		},
	})

	const updateJobMutation = useMutation({
		mutationFn: ({id, data}: {id: string; data: CronJobFormData}) =>
			updateCronJob(id, data),
		onSuccess: () => {
			toast.success('Job updated successfully')
			queryClient.invalidateQueries({queryKey: ['cronJobs']})
			setEditingJob(null)
		},
		onError: (error: Error) => {
			toast.error('Failed to update job', {description: error.message})
		},
	})

	const deleteJobMutation = useMutation({
		mutationFn: deleteCronJob,
		onSuccess: () => {
			toast.success('Job deleted successfully')
			queryClient.invalidateQueries({queryKey: ['cronJobs']})
			setDeletingJob(null)
		},
		onError: (error: Error) => {
			toast.error('Failed to delete job', {description: error.message})
		},
	})

	const bulkToggleMutation = useMutation({
		mutationFn: async ({ids, enabled}: {ids: string[]; enabled: boolean}) => {
			await Promise.all(
				ids.map(id =>
					fetch(`/api/cron/jobs/${id}`, {
						method: 'PATCH',
						headers: {'Content-Type': 'application/json'},
						body: JSON.stringify({enabled}),
					})
				)
			)
		},
		onSuccess: () => {
			toast.success('Jobs updated successfully')
			queryClient.invalidateQueries({queryKey: ['cronJobs']})
			setSelectedRows([])
		},
		onError: (error: Error) => {
			toast.error('Failed to update jobs', {description: error.message})
		},
	})

	const bulkDeleteMutation = useMutation({
		mutationFn: async (ids: string[]) => {
			await Promise.all(ids.map(id => deleteCronJob(id)))
		},
		onSuccess: () => {
			toast.success('Jobs deleted successfully')
			queryClient.invalidateQueries({queryKey: ['cronJobs']})
			setSelectedRows([])
		},
		onError: (error: Error) => {
			toast.error('Failed to delete jobs', {description: error.message})
		},
	})

	const handleShowHistory = (job: CronJob) => {
		setSelectedJob(job)
	}

	const handleCloseHistory = () => {
		setSelectedJob(null)
	}

	const handleSaveJob = async (data: CronJobFormData, id?: string) => {
		if (id) {
			await updateJobMutation.mutateAsync({id, data})
		} else {
			await createJobMutation.mutateAsync(data)
		}
	}

	const handleDeleteJob = async () => {
		if (deletingJob) {
			await deleteJobMutation.mutateAsync(deletingJob.id)
		}
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<div className="animate-pulse text-muted-foreground">Loading cron jobs...</div>
			</div>
		)
	}

	if (error) {
		return (
			<Alert variant="destructive">
				<Terminal className="h-4 w-4" />
				<AlertTitle>Error loading cron jobs</AlertTitle>
				<AlertDescription>{error.message}</AlertDescription>
			</Alert>
		)
	}

	const cronColumns = columns({
		onToggle: toggleJobMutation.mutate,
		onRun: runJobMutation.mutate,
		onShowHistory: handleShowHistory,
		onEdit: setEditingJob,
		onDelete: setDeletingJob,
		runningJobId,
		enableSelection: true,
	})

	return (
		<div className="space-y-4">
			{/* Action Bar */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					{selectedRows.length > 0 && (
						<>
							<span className="text-sm text-muted-foreground">
								{selectedRows.length} selected
							</span>
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									bulkToggleMutation.mutate({
										ids: selectedRows.map(r => r.id),
										enabled: true,
									})
								}
								disabled={bulkToggleMutation.isPending}
							>
								<Play className="h-4 w-4 mr-1" />
								Enable All
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									bulkToggleMutation.mutate({
										ids: selectedRows.map(r => r.id),
										enabled: false,
									})
								}
								disabled={bulkToggleMutation.isPending}
							>
								<Pause className="h-4 w-4 mr-1" />
								Disable All
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="text-destructive hover:text-destructive"
								onClick={() => {
									if (confirm(`Delete ${selectedRows.length} jobs?`)) {
										bulkDeleteMutation.mutate(selectedRows.map(r => r.id))
									}
								}}
								disabled={bulkDeleteMutation.isPending}
							>
								<Trash2 className="h-4 w-4 mr-1" />
								Delete
							</Button>
						</>
					)}
				</div>
				<Button onClick={() => setIsCreateDialogOpen(true)}>
					<Plus className="h-4 w-4 mr-2" />
					New Job
				</Button>
			</div>

			{/* Data Table */}
			<DataTable
				columns={cronColumns}
				data={jobs || []}
				onRowSelectionChange={setSelectedRows}
			/>

			{/* Run History Dialog */}
			{selectedJob && (
				<RunHistoryDialog
					job={selectedJob}
					isOpen={!!selectedJob}
					onClose={handleCloseHistory}
				/>
			)}

			{/* Create Job Dialog */}
			<CronJobDialog
				isOpen={isCreateDialogOpen}
				onClose={() => setIsCreateDialogOpen(false)}
				onSave={handleSaveJob}
				isLoading={createJobMutation.isPending}
			/>

			{/* Edit Job Dialog */}
			<CronJobDialog
				isOpen={!!editingJob}
				onClose={() => setEditingJob(null)}
				onSave={handleSaveJob}
				job={editingJob}
				isLoading={updateJobMutation.isPending}
			/>

			{/* Delete Confirmation Dialog */}
			<DeleteJobDialog
				job={deletingJob}
				isOpen={!!deletingJob}
				onClose={() => setDeletingJob(null)}
				onConfirm={handleDeleteJob}
				isLoading={deleteJobMutation.isPending}
			/>
		</div>
	)
}
