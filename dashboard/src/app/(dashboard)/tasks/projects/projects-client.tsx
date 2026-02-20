
"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Project {
  id: string
  label: string
  icon: string
  description: string | null
  color: string
  active: boolean
  createdAt: string
  owner: string | null
  status: string | null
  tasksOpen: number
  tasksRunning: number
  tasksDone: number
}

const fetchProjects = async (): Promise<Project[]> => {
  const res = await fetch("/api/projects")
  if (!res.ok) {
    throw new Error("Network response was not ok")
  }
  return res.json()
}

const ProjectCard = ({ project }: { project: Project }) => {
  const totalTasks = project.tasksOpen + project.tasksRunning + project.tasksDone
  const progress = totalTasks > 0 ? (project.tasksDone / totalTasks) * 100 : 0

  return (
    <Link href={`/tasks/projects/${project.id}`}>
      <Card className="bg-card/50 border-border hover:bg-muted/50 transition-colors h-full flex flex-col">
        <CardHeader className="flex flex-row items-start gap-4 space-y-0">
          <div className="text-2xl">{project.icon}</div>
          <div className="flex-1">
            <CardTitle className="text-base font-semibold">{project.label}</CardTitle>
            {project.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
            )}
          </div>
          {project.status && (
             <Badge variant={project.status === 'active' ? 'default' : 'secondary'} className={`shrink-0 text-[10px] px-1.5 py-0 ${
                project.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'
             }`}>
                {project.status}
             </Badge>
          )}
        </CardHeader>
        <CardContent className="flex-grow">
          <div className="text-xs text-muted-foreground space-y-2">
            <div className="flex justify-between">
              <span>Owner:</span>
              <span className="font-medium text-foreground">{project.owner || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Activity:</span>
              <span className="font-medium text-foreground">TODO</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-2 text-xs pt-4">
            <div className="w-full flex justify-between text-muted-foreground">
                <TooltipProvider>
                    <div className="flex gap-4">
                        <Tooltip>
                            <TooltipTrigger>
                                <span className="flex items-center gap-1">
                                    <div className="h-2 w-2 rounded-full bg-yellow-500"/> {project.tasksOpen} Open
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>Queued Tasks</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger>
                                <span className="flex items-center gap-1">
                                    <div className="h-2 w-2 rounded-full bg-blue-500"/> {project.tasksRunning} Running
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>Running Tasks</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger>
                                <span className="flex items-center gap-1">
                                    <div className="h-2 w-2 rounded-full bg-green-500"/> {project.tasksDone} Done
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>Done Tasks</TooltipContent>
                        </Tooltip>
                    </div>
                </TooltipProvider>
                <span className="font-semibold">{totalTasks} Total</span>
            </div>
          <Progress value={progress} className="h-2 w-full" />
        </CardFooter>
      </Card>
    </Link>
  )
}

function Legend() {
  return (
    <div className="mt-8 p-4 border border-border rounded-lg bg-card/30">
      <h3 className="text-sm font-medium mb-3">Legend</h3>
      <div className="flex flex-wrap gap-6 text-xs text-muted-foreground">
        <div className="space-y-2">
          <p className="font-medium text-foreground">Task Status</p>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-yellow-500"/>
            <span>Open — Queued, planned, assigned, or backlog</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500"/>
            <span>Running — Currently being worked on</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500"/>
            <span>Done — Completed or in review</span>
          </div>
        </div>
        <div className="space-y-2">
          <p className="font-medium text-foreground">Project Status</p>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-green-500/10 text-green-500 text-[10px] px-1.5 py-0">active</Badge>
            <span>Project is actively being worked on</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0">paused</Badge>
            <span>Project is on hold</span>
          </div>
        </div>
        <div className="space-y-2">
          <p className="font-medium text-foreground">Progress Bar</p>
          <span>Shows percentage of tasks completed (done / total)</span>
        </div>
      </div>
    </div>
  )
}

export function ProjectsClient() {
  const { data: projects, isLoading, isError } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  })

  if (isLoading) return <div>Loading projects...</div>
  if (isError) return <div>Error loading projects.</div>
  if (!projects || projects.length === 0) return <div>No projects found.</div>

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {projects.map(project => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
      <Legend />
    </>
  )
}
