
"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { notFound, useRouter } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { Task } from "@/lib/types" // Assuming a Task type exists

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
  tasks: Task[]
}

const fetchProject = async (projectId: string): Promise<Project> => {
  const res = await fetch(`/api/projects/${projectId}`)
  if (!res.ok) {
    if (res.status === 404) notFound()
    throw new Error("Network response was not ok")
  }
  return res.json()
}

const updateProject = async (projectData: Partial<Project> & { id: string }) => {
  const { id, ...data } = projectData
  const res = await fetch(`/api/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    throw new Error("Failed to update project")
  }
  return res.json()
}


export function ProjectDetailClient({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<Project>>({})

  const { data: project, isLoading, isError } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: () => fetchProject(projectId),
    enabled: !!projectId,
  })

  useEffect(() => {
    if (project) {
      setFormData({
        label: project.label,
        description: project.description,
        icon: project.icon,
        owner: project.owner,
        status: project.status,
      })
    }
  }, [project])

  const mutation = useMutation({
    mutationFn: updateProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] })
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      setIsEditing(false)
    },
    onError: (error) => {
        alert(`Error updating: ${error.message}`)
    }
  })

  const handleSave = () => {
    mutation.mutate({ id: projectId, ...formData })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }


  if (isLoading) return <div>Loading project details...</div>
  if (isError) return <div>Error loading project.</div>
  if (!project) return notFound()

  return (
    <>
      <div className="flex items-center justify-between">
        <PageHeader 
          title={`${project.icon} ${project.label}`}
          subtitle={project.description || "No description."} 
        />
        <div>
            {isEditing ? (
                <>
                    <Button variant="outline" onClick={() => setIsEditing(false)} className="mr-2">Cancel</Button>
                    <Button onClick={handleSave} disabled={mutation.isPending}>
                        {mutation.isPending ? "Saving..." : "Save"}
                    </Button>
                </>
            ) : (
                <>
                    <Button variant="outline" onClick={() => router.push('/tasks')} className="mr-2">New Task</Button>
                    <Button onClick={() => setIsEditing(true)}>Edit Project</Button>
                </>
            )}
        </div>
      </div>
      
      {isEditing && (
        <Card>
            <CardContent className="p-6 grid grid-cols-2 gap-4">
                <Input name="label" value={formData.label || ''} onChange={handleInputChange} placeholder="Project Name" />
                <Input name="icon" value={formData.icon || ''} onChange={handleInputChange} placeholder="Icon (emoji)" />
                <Textarea name="description" value={formData.description || ''} onChange={handleInputChange} placeholder="Description" className="col-span-2" />
                <Input name="owner" value={formData.owner || ''} onChange={handleInputChange} placeholder="Owner" />
                <Input name="status" value={formData.status || ''} onChange={handleInputChange} placeholder="Status (e.g. active)" />
            </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.tasks.map((task: any) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <Link href={`/tasks?taskId=${task.id}`} className="hover:underline">{task.title}</Link>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{task.status}</Badge></TableCell>
                  <TableCell>{task.agentId || 'N/A'}</TableCell>
                  <TableCell>{new Date(task.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {project.tasks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">No tasks found for this project.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
