'use client'

import {useState, useEffect} from 'react'
import {CronJob, CronJobFormData, TIMEZONES, SCHEDULE_PRESETS, CRON_TEMPLATES} from '@/lib/types/cron'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Textarea} from '@/components/ui/textarea'
import {Switch} from '@/components/ui/switch'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from '@/components/ui/dialog'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs'
import {Badge} from '@/components/ui/badge'
import {Clock, Calendar, RefreshCw, FileText, Zap} from 'lucide-react'

interface CronJobDialogProps {
	isOpen: boolean
	onClose: () => void
	onSave: (data: CronJobFormData, id?: string) => Promise<void>
	job?: CronJob | null
	isLoading?: boolean
}

function parseCronExpression(expression: string): string {
	// Simple cron expression parser for human-readable output
	const parts = expression.split(' ')
	if (parts.length !== 5) return expression
	
	const [minute, hour, dayOfMonth, month, dayOfWeek] = parts
	
	// Common patterns
	if (expression === '* * * * *') return 'Every minute'
	if (expression === '0 * * * *') return 'Every hour at minute 0'
	if (expression === '0 0 * * *') return 'Daily at midnight'
	if (minute !== '*' && hour !== '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
		return `Daily at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
	}
	if (minute !== '*' && hour !== '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '1-5') {
		return `Weekdays at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
	}
	if (minute !== '*' && hour !== '*' && dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
		const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
		const dayNum = parseInt(dayOfWeek)
		const dayName = isNaN(dayNum) ? dayOfWeek : days[dayNum] || dayOfWeek
		return `${dayName} at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
	}
	
	return expression
}

function formatInterval(ms: string | number): string {
	const milliseconds = typeof ms === 'string' ? parseInt(ms) : ms
	if (isNaN(milliseconds)) return String(ms)
	
	const seconds = Math.floor(milliseconds / 1000)
	const minutes = Math.floor(seconds / 60)
	const hours = Math.floor(minutes / 60)
	const days = Math.floor(hours / 24)
	
	if (days > 0) return `Every ${days} day${days > 1 ? 's' : ''}`
	if (hours > 0) return `Every ${hours} hour${hours > 1 ? 's' : ''}`
	if (minutes > 0) return `Every ${minutes} minute${minutes > 1 ? 's' : ''}`
	return `Every ${seconds} second${seconds > 1 ? 's' : ''}`
}

export function CronJobDialog({isOpen, onClose, onSave, job, isLoading}: CronJobDialogProps) {
	const isEditing = !!job
	
	const [formData, setFormData] = useState<CronJobFormData>({
		name: '',
		kind: 'cron',
		schedule: '0 9 * * *',
		timezone: 'Europe/Paris',
		session_target: 'isolated',
		prompt: '',
		model: 'anthropic/claude-sonnet-4-20250514',
		enabled: true,
	})
	
	const [activeTab, setActiveTab] = useState<string>('form')
	
	useEffect(() => {
		if (job) {
			// Determine kind from schedule format
			let kind: 'at' | 'every' | 'cron' = 'cron'
			if (job.schedule.includes('T')) {
				kind = 'at' // ISO date format
			} else if (/^\d+$/.test(job.schedule)) {
				kind = 'every' // Milliseconds interval
			}
			
			setFormData({
				name: job.name,
				kind,
				schedule: job.schedule,
				timezone: job.timezone || 'Europe/Paris',
				session_target: job.session_target || 'isolated',
				prompt: job.prompt || '',
				model: job.model || 'anthropic/claude-sonnet-4-20250514',
				enabled: job.enabled,
			})
		} else {
			setFormData({
				name: '',
				kind: 'cron',
				schedule: '0 9 * * *',
				timezone: 'Europe/Paris',
				session_target: 'isolated',
				prompt: '',
				model: 'anthropic/claude-sonnet-4-20250514',
				enabled: true,
			})
		}
		setActiveTab('form')
	}, [job, isOpen])
	
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		await onSave(formData, job?.id)
	}
	
	const applyTemplate = (templateId: string) => {
		const template = CRON_TEMPLATES.find(t => t.id === templateId)
		if (template) {
			setFormData(prev => ({
				...prev,
				name: template.name,
				kind: template.kind,
				schedule: template.schedule,
				prompt: template.prompt,
				model: template.model || prev.model,
			}))
			setActiveTab('form')
		}
	}
	
	const applyPreset = (preset: typeof SCHEDULE_PRESETS[0]) => {
		setFormData(prev => ({
			...prev,
			kind: preset.kind,
			schedule: preset.value,
		}))
	}
	
	const getSchedulePreview = () => {
		switch (formData.kind) {
			case 'cron':
				return parseCronExpression(formData.schedule)
			case 'every':
				return formatInterval(formData.schedule)
			case 'at':
				try {
					return `Once at ${new Date(formData.schedule).toLocaleString()}`
				} catch {
					return formData.schedule
				}
		}
	}
	
	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{isEditing ? 'Edit Cron Job' : 'Create Cron Job'}</DialogTitle>
					<DialogDescription>
						{isEditing ? 'Modify the scheduled job configuration.' : 'Set up a new scheduled job.'}
					</DialogDescription>
				</DialogHeader>
				
				<Tabs value={activeTab} onValueChange={setActiveTab}>
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="form">Configuration</TabsTrigger>
						<TabsTrigger value="templates">Templates</TabsTrigger>
					</TabsList>
					
					<TabsContent value="templates" className="space-y-4 mt-4">
						<p className="text-sm text-muted-foreground">
							Quick-start with a pre-configured template:
						</p>
						<div className="grid gap-3">
							{CRON_TEMPLATES.map(template => (
								<button
									key={template.id}
									type="button"
									onClick={() => applyTemplate(template.id)}
									className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent text-left transition-colors"
								>
									<FileText className="h-5 w-5 mt-0.5 text-muted-foreground" />
									<div className="flex-1">
										<div className="font-medium">{template.name}</div>
										<div className="text-sm text-muted-foreground">{template.description}</div>
										<Badge variant="secondary" className="mt-2">
											{template.kind === 'cron' 
												? parseCronExpression(template.schedule)
												: formatInterval(template.schedule)}
										</Badge>
									</div>
								</button>
							))}
						</div>
					</TabsContent>
					
					<TabsContent value="form" className="space-y-4 mt-4">
						<form onSubmit={handleSubmit} className="space-y-4">
							{/* Name */}
							<div className="space-y-2">
								<Label htmlFor="name">Name *</Label>
								<Input
									id="name"
									value={formData.name}
									onChange={e => setFormData(prev => ({...prev, name: e.target.value}))}
									placeholder="My Daily Task"
									required
								/>
							</div>
							
							{/* Schedule Type */}
							<div className="space-y-2">
								<Label>Schedule Type</Label>
								<div className="flex gap-2">
									<Button
										type="button"
										variant={formData.kind === 'cron' ? 'default' : 'outline'}
										size="sm"
										onClick={() => setFormData(prev => ({...prev, kind: 'cron', schedule: '0 9 * * *'}))}
									>
										<Calendar className="h-4 w-4 mr-1" />
										Cron
									</Button>
									<Button
										type="button"
										variant={formData.kind === 'every' ? 'default' : 'outline'}
										size="sm"
										onClick={() => setFormData(prev => ({...prev, kind: 'every', schedule: '3600000'}))}
									>
										<RefreshCw className="h-4 w-4 mr-1" />
										Interval
									</Button>
									<Button
										type="button"
										variant={formData.kind === 'at' ? 'default' : 'outline'}
										size="sm"
										onClick={() => setFormData(prev => ({...prev, kind: 'at', schedule: new Date(Date.now() + 3600000).toISOString()}))}
									>
										<Clock className="h-4 w-4 mr-1" />
										One-time
									</Button>
								</div>
							</div>
							
							{/* Schedule Configuration */}
							<div className="space-y-2">
								<Label htmlFor="schedule">
									{formData.kind === 'cron' && 'Cron Expression'}
									{formData.kind === 'every' && 'Interval (milliseconds)'}
									{formData.kind === 'at' && 'Date/Time (ISO format)'}
								</Label>
								
								{formData.kind === 'cron' && (
									<>
										<Input
											id="schedule"
											value={formData.schedule}
											onChange={e => setFormData(prev => ({...prev, schedule: e.target.value}))}
											placeholder="0 9 * * *"
											className="font-mono"
										/>
										<div className="flex flex-wrap gap-1 mt-2">
											{SCHEDULE_PRESETS.filter(p => p.kind === 'cron').map(preset => (
												<Badge
													key={preset.value}
													variant="outline"
													className="cursor-pointer hover:bg-accent"
													onClick={() => applyPreset(preset)}
												>
													{preset.label}
												</Badge>
											))}
										</div>
									</>
								)}
								
								{formData.kind === 'every' && (
									<>
										<Input
											id="schedule"
											type="number"
											value={formData.schedule}
											onChange={e => setFormData(prev => ({...prev, schedule: e.target.value}))}
											placeholder="3600000"
											min="1000"
										/>
										<div className="flex flex-wrap gap-1 mt-2">
											{SCHEDULE_PRESETS.filter(p => p.kind === 'every').map(preset => (
												<Badge
													key={preset.value}
													variant="outline"
													className="cursor-pointer hover:bg-accent"
													onClick={() => applyPreset(preset)}
												>
													{preset.label}
												</Badge>
											))}
										</div>
									</>
								)}
								
								{formData.kind === 'at' && (
									<Input
										id="schedule"
										type="datetime-local"
										value={formData.schedule.slice(0, 16)}
										onChange={e => setFormData(prev => ({...prev, schedule: new Date(e.target.value).toISOString()}))}
									/>
								)}
								
								<div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
									<Zap className="h-4 w-4" />
									<span>{getSchedulePreview()}</span>
								</div>
							</div>
							
							{/* Timezone */}
							<div className="space-y-2">
								<Label htmlFor="timezone">Timezone</Label>
								<Select
									value={formData.timezone}
									onValueChange={value => setFormData(prev => ({...prev, timezone: value}))}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{TIMEZONES.map(tz => (
											<SelectItem key={tz.value} value={tz.value}>
												{tz.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							
							{/* Session Target */}
							<div className="space-y-2">
								<Label>Session Target</Label>
								<div className="flex gap-2">
									<Button
										type="button"
										variant={formData.session_target === 'isolated' ? 'default' : 'outline'}
										size="sm"
										onClick={() => setFormData(prev => ({...prev, session_target: 'isolated'}))}
									>
										Isolated
									</Button>
									<Button
										type="button"
										variant={formData.session_target === 'main' ? 'default' : 'outline'}
										size="sm"
										onClick={() => setFormData(prev => ({...prev, session_target: 'main'}))}
									>
										Main
									</Button>
								</div>
								<p className="text-xs text-muted-foreground">
									Isolated: Runs in a separate agent session. Main: Runs in the main agent context.
								</p>
							</div>
							
							{/* Prompt */}
							<div className="space-y-2">
								<Label htmlFor="prompt">Prompt / Message *</Label>
								<Textarea
									id="prompt"
									value={formData.prompt}
									onChange={e => setFormData(prev => ({...prev, prompt: e.target.value}))}
									placeholder="What should the agent do when this job runs?"
									rows={4}
									required
								/>
							</div>
							
							{/* Model */}
							<div className="space-y-2">
								<Label htmlFor="model">Model</Label>
								<Select
									value={formData.model}
									onValueChange={value => setFormData(prev => ({...prev, model: value}))}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="anthropic/claude-sonnet-4-20250514">Claude Sonnet 4</SelectItem>
										<SelectItem value="anthropic/claude-opus-4-5">Claude Opus 4.5</SelectItem>
										<SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
										<SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
										<SelectItem value="openai/gpt-4.1">GPT-4.1</SelectItem>
									</SelectContent>
								</Select>
							</div>
							
							{/* Enabled */}
							<div className="flex items-center gap-3">
								<Switch
									id="enabled"
									checked={formData.enabled}
									onCheckedChange={checked => setFormData(prev => ({...prev, enabled: checked}))}
								/>
								<Label htmlFor="enabled" className="cursor-pointer">
									Enable job immediately
								</Label>
							</div>
							
							<DialogFooter className="pt-4">
								<Button type="button" variant="outline" onClick={onClose}>
									Cancel
								</Button>
								<Button type="submit" disabled={isLoading}>
									{isLoading ? 'Saving...' : isEditing ? 'Update Job' : 'Create Job'}
								</Button>
							</DialogFooter>
						</form>
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	)
}
