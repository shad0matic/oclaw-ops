
'use client'

import {ColumnDef} from '@tanstack/react-table'
import {CronJob} from '@/lib/types/cron'
import {Badge} from '@/components/ui/badge'
import {Switch} from '@/components/ui/switch'
import {Button} from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {MoreHorizontal, Play, History} from 'lucide-react'
import {format, formatDistanceToNow} from 'date-fns'

type CronColumnsProps = {
	onToggle: (data: {id: string; enabled: boolean}) => void
	onRun: (id: string) => void
	onShowHistory: (job: CronJob) => void
}

export const columns = ({
	onToggle,
	onRun,
	onShowHistory,
}: CronColumnsProps): ColumnDef<CronJob>[] => [
	{
		accessorKey: 'name',
		header: 'Name',
		cell: ({row}) => <span className="font-medium">{row.original.name}</span>,
	},
	{
		accessorKey: 'human_schedule',
		header: 'Schedule',
	},
	{
		accessorKey: 'model',
		header: 'Model',
	},
	{
		accessorKey: 'last_run_at',
		header: 'Last Run',
		cell: ({row}) => {
			const lastRun = row.original.last_run_at
			return lastRun
				? formatDistanceToNow(new Date(lastRun), {addSuffix: true})
				: 'Never'
		},
	},
	{
		accessorKey: 'next_run_at',
		header: 'Next Run',
		cell: ({row}) => {
			const nextRun = row.original.next_run_at
			return format(new Date(nextRun), 'yyyy-MM-dd HH:mm:ss')
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
					</DropdownMenuContent>
				</DropdownMenu>
			)
		},
	},
]
