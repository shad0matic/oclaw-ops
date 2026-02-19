'use client'

import {ColumnDef} from '@tanstack/react-table'
import {CronJob} from '@/lib/types/cron'
import {Badge} from '@/components/ui/badge'
import {Switch} from '@/components/ui/switch'
import {Button} from '@/components/ui/button'
import {Checkbox} from '@/components/ui/checkbox'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {MoreHorizontal, Play, History, Pencil, Trash2, Loader2} from 'lucide-react'
import {format, formatDistanceToNow} from 'date-fns'

type CronColumnsProps = {
	onToggle: (data: {id: string; enabled: boolean}) => void
	onRun: (id: string) => void
	onShowHistory: (job: CronJob) => void
	onEdit: (job: CronJob) => void
	onDelete: (job: CronJob) => void
	runningJobId?: string | null
	enableSelection?: boolean
}

export const columns = ({
	onToggle,
	onRun,
	onShowHistory,
	onEdit,
	onDelete,
	runningJobId,
	enableSelection,
}: CronColumnsProps): ColumnDef<CronJob>[] => {
	const cols: ColumnDef<CronJob>[] = []
	
	// Selection column (optional)
	if (enableSelection) {
		cols.push({
			id: 'select',
			header: ({table}) => (
				<Checkbox
					checked={
						table.getIsAllPageRowsSelected() ||
						(table.getIsSomePageRowsSelected() && 'indeterminate')
					}
					onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
					aria-label="Select all"
				/>
			),
			cell: ({row}) => (
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={value => row.toggleSelected(!!value)}
					aria-label="Select row"
				/>
			),
			enableSorting: false,
			enableHiding: false,
		})
	}
	
	cols.push(
		{
			accessorKey: 'name',
			header: 'Name',
			cell: ({row}) => (
				<div className="flex items-center gap-2">
					{runningJobId === row.original.id && (
						<Loader2 className="h-4 w-4 animate-spin text-primary" />
					)}
					<span className="font-medium">{row.original.name}</span>
				</div>
			),
		},
		{
			accessorKey: 'human_schedule',
			header: 'Schedule',
			cell: ({row}) => (
				<code className="text-sm bg-muted px-2 py-1 rounded">
					{row.original.human_schedule || row.original.schedule}
				</code>
			),
		},
		{
			accessorKey: 'model',
			header: 'Model',
			cell: ({row}) => {
				const model = row.original.model
				// Extract just the model name without provider prefix
				const shortModel = model?.split('/').pop() || model
				return <span className="text-sm text-muted-foreground">{shortModel}</span>
			},
		},
		{
			accessorKey: 'last_run_at',
			header: 'Last Run',
			cell: ({row}) => {
				const lastRun = row.original.last_run_at
				return lastRun ? (
					<span title={format(new Date(lastRun), 'yyyy-MM-dd HH:mm:ss')}>
						{formatDistanceToNow(new Date(lastRun), {addSuffix: true})}
					</span>
				) : (
					<span className="text-muted-foreground">Never</span>
				)
			},
		},
		{
			accessorKey: 'next_run_at',
			header: 'Next Run',
			cell: ({row}) => {
				const nextRun = row.original.next_run_at
				if (!nextRun || !row.original.enabled) {
					return <span className="text-muted-foreground">—</span>
				}
				return (
					<span title={format(new Date(nextRun), 'yyyy-MM-dd HH:mm:ss')}>
						{formatDistanceToNow(new Date(nextRun), {addSuffix: true})}
					</span>
				)
			},
		},
		{
			accessorKey: 'enabled',
			header: 'Status',
			cell: ({row}) => {
				const {id, enabled} = row.original
				return (
					<div className="flex items-center space-x-2">
						<Switch
							checked={enabled}
							onCheckedChange={checked => onToggle({id, enabled: checked})}
							aria-label="Toggle job status"
						/>
						<Badge variant={enabled ? 'success' : 'secondary'}>
							{enabled ? 'Enabled' : 'Disabled'}
						</Badge>
					</div>
				)
			},
		},
		{
			id: 'actions',
			cell: ({row}) => {
				const job = row.original
				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" className="h-8 w-8 p-0">
								<span className="sr-only">Open menu</span>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => onRun(job.id)}>
								<Play className="mr-2 h-4 w-4" />
								Run Now
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => onShowHistory(job)}>
								<History className="mr-2 h-4 w-4" />
								View History
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={() => onEdit(job)}>
								<Pencil className="mr-2 h-4 w-4" />
								Edit
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => onDelete(job)}
								className="text-destructive focus:text-destructive"
							>
								<Trash2 className="mr-2 h-4 w-4" />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)
			},
		},
	)
	
	return cols
}
