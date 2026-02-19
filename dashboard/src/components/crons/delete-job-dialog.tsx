'use client'

import {CronJob} from '@/lib/types/cron'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {Trash2} from 'lucide-react'

interface DeleteJobDialogProps {
	job: CronJob | null
	isOpen: boolean
	onClose: () => void
	onConfirm: () => Promise<void>
	isLoading?: boolean
}

export function DeleteJobDialog({job, isOpen, onClose, onConfirm, isLoading}: DeleteJobDialogProps) {
	const handleConfirm = async () => {
		await onConfirm()
		onClose()
	}
	
	return (
		<AlertDialog open={isOpen} onOpenChange={onClose}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<div className="flex items-center gap-3 mb-2">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
							<Trash2 className="h-5 w-5 text-destructive" />
						</div>
						<AlertDialogTitle>Delete Cron Job</AlertDialogTitle>
					</div>
					<AlertDialogDescription>
						Are you sure you want to delete <strong>{job?.name}</strong>?
						<br />
						<br />
						This action cannot be undone. The job will stop running and all its
						configuration will be permanently removed.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						onClick={handleConfirm}
						disabled={isLoading}
					>
						{isLoading ? 'Deleting...' : 'Delete Job'}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
