"use client"

import { useState, useEffect, useCallback } from "react"

interface Project {
  id: string
  label: string
  icon: string
  description: string | null
  color: string
  active: boolean
}

const COLOR_OPTIONS = [
  { value: "border-l-red-500", label: "Red" },
  { value: "border-l-amber-500", label: "Amber" },
  { value: "border-l-yellow-500", label: "Yellow" },
  { value: "border-l-emerald-500", label: "Emerald" },
  { value: "border-l-blue-500", label: "Blue" },
  { value: "border-l-indigo-500", label: "Indigo" },
  { value: "border-l-pink-500", label: "Pink" },
  { value: "border-l-purple-500", label: "Purple" },
  { value: "border-l-zinc-500", label: "Gray" },
]

function ColorDot({ color, selected, onClick }: { color: string; selected: boolean; onClick: () => void }) {
  // Extract the color name from the class
  const bgColor = color.replace("border-l-", "bg-")
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-6 h-6 rounded-full ${bgColor} ${selected ? "ring-2 ring-offset-2 ring-offset-background ring-foreground" : "opacity-60 hover:opacity-100"} transition-all`}
      aria-label={color}
    />
  )
}

export function ProjectManager() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formId, setFormId] = useState("")
  const [formLabel, setFormLabel] = useState("")
  const [formIcon, setFormIcon] = useState("📦")
  const [formDesc, setFormDesc] = useState("")
  const [formColor, setFormColor] = useState("border-l-zinc-500")

  const fetchProjects = useCallback(async () => {
    const res = await fetch("/api/projects")
    const data = await res.json()
    setProjects(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  function startEdit(p: Project) {
    setEditing(p.id)
    setFormLabel(p.label)
    setFormIcon(p.icon)
    setFormDesc(p.description || "")
    setFormColor(p.color)
    setShowAdd(false)
  }

  function startAdd() {
    setEditing(null)
    setShowAdd(true)
    setFormId("")
    setFormLabel("")
    setFormIcon("📦")
    setFormDesc("")
    setFormColor("border-l-zinc-500")
  }

  function cancelForm() {
    setEditing(null)
    setShowAdd(false)
  }

  async function saveProject() {
    setSaving(true)
    try {
      if (showAdd) {
        const slug = formId || formLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")
        await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: slug, label: formLabel, icon: formIcon, description: formDesc || null, color: formColor }),
        })
      } else if (editing) {
        await fetch(`/api/projects?id=${editing}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: formLabel, icon: formIcon, description: formDesc || null, color: formColor }),
        })
      }
      cancelForm()
      await fetchProjects()
    } finally {
      setSaving(false)
    }
  }

  async function archiveProject(id: string) {
    if (!confirm(`Archive project "${id}"? Tasks won't be deleted.`)) return
    await fetch(`/api/projects?id=${id}`, { method: "DELETE" })
    await fetchProjects()
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading projects...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Projects</h2>
          <p className="text-sm text-muted-foreground">Manage kanban projects, labels, icons, and colors.</p>
        </div>
        <button
          onClick={startAdd}
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-foreground text-background hover:opacity-90 transition-opacity"
        >
          + Add Project
        </button>
      </div>

      {/* Project list */}
      <div className="space-y-2">
        {projects.map((p) => (
          <div
            key={p.id}
            className={`flex items-center gap-3 p-3 rounded-lg border border-border ${p.color} border-l-4 bg-card`}
          >
            <span className="text-2xl" aria-hidden="true">{p.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{p.label}</p>
              <p className="text-xs text-muted-foreground truncate">{p.description || p.id}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => startEdit(p)}
                className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => archiveProject(p.id)}
                className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-red-500 hover:border-red-300 transition-colors"
              >
                Archive
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit form */}
      {(showAdd || editing) && (
        <div className="p-4 rounded-lg border border-border bg-card space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            {showAdd ? "Add Project" : `Edit: ${editing}`}
          </h3>

          {showAdd && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Slug (ID)</label>
              <input
                type="text"
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                placeholder="my-project"
                className="w-full mt-1 px-3 py-1.5 text-sm rounded-md border border-border bg-background text-foreground"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Label</label>
              <input
                type="text"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 text-sm rounded-md border border-border bg-background text-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Icon (emoji)</label>
              <input
                type="text"
                value={formIcon}
                onChange={(e) => setFormIcon(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 text-sm rounded-md border border-border bg-background text-foreground"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <input
              type="text"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Optional description"
              className="w-full mt-1 px-3 py-1.5 text-sm rounded-md border border-border bg-background text-foreground"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Color</label>
            <div className="flex gap-2 mt-1.5">
              {COLOR_OPTIONS.map((c) => (
                <ColorDot
                  key={c.value}
                  color={c.value}
                  selected={formColor === c.value}
                  onClick={() => setFormColor(c.value)}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={saveProject}
              disabled={saving || !formLabel}
              className="px-4 py-1.5 text-sm font-medium rounded-md bg-foreground text-background hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={cancelForm}
              className="px-4 py-1.5 text-sm font-medium rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
