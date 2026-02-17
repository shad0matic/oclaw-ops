"use client";

import { useState, useEffect } from "react";
import { FolderOpen, Link2, Settings, Sparkles, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface FolderContextBarProps {
  folderName: string;
  bookmarkCount: number;
  onClear: () => void;
}

interface FolderMapping {
  x_folder: string;
  description: string | null; // project name stored here
  analysis_prompt: string | null;
}

export function FolderContextBar({ folderName, bookmarkCount, onClear }: FolderContextBarProps) {
  const [projects, setProjects] = useState<string[]>([]);
  const [mapping, setMapping] = useState<FolderMapping | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [analysisPrompt, setAnalysisPrompt] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Fetch available projects and current mapping
  useEffect(() => {
    async function fetchData() {
      try {
        const [projectsRes, mappingRes] = await Promise.all([
          fetch("/api/x-folder-mappings/projects"),
          fetch(`/api/x-folder-mappings?x_folder=${encodeURIComponent(folderName)}`)
        ]);
        
        const projectsData = await projectsRes.json();
        const mappingData = await mappingRes.json();
        
        setProjects(Array.isArray(projectsData) ? projectsData : []);
        setMapping(mappingData);
        setSelectedProject(mappingData?.description || "");
        setAnalysisPrompt(mappingData?.analysis_prompt || "");
      } catch (error) {
        console.error("Failed to fetch folder data:", error);
      }
    }
    
    if (folderName) {
      fetchData();
    }
  }, [folderName]);

  const handleProjectChange = async (value: string) => {
    setSelectedProject(value);
    setSaving(true);
    
    try {
      await fetch("/api/x-folder-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          x_folder: folderName,
          project: value === "none" ? null : value,
          analysis_prompt: analysisPrompt || null
        })
      });
      
      setMapping(prev => prev ? { ...prev, description: value === "none" ? null : value } : null);
    } catch (error) {
      console.error("Failed to save mapping:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrompt = async () => {
    setSaving(true);
    try {
      await fetch("/api/x-folder-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          x_folder: folderName,
          project: selectedProject || null,
          analysis_prompt: analysisPrompt || null
        })
      });
      setSettingsOpen(false);
    } catch (error) {
      console.error("Failed to save prompt:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-muted/50 border-b border-border">
      <div className="flex items-center gap-3">
        <FolderOpen className="h-5 w-5 text-blue-500" />
        <span className="font-medium">{folderName}</span>
        <span className="text-sm text-muted-foreground">({bookmarkCount} bookmarks)</span>
        <Button variant="ghost" size="sm" onClick={onClear} className="h-6 w-6 p-0 ml-2">
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Project mapping dropdown */}
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedProject || "none"} onValueChange={handleProjectChange}>
            <SelectTrigger className="w-[180px] h-8">
              <SelectValue placeholder="Map to project..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No mapping</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project} value={project}>
                  {project}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {saving && <span className="text-xs text-muted-foreground">Saving...</span>}
          {!saving && selectedProject && selectedProject !== "none" && (
            <Check className="h-4 w-4 text-green-500" />
          )}
        </div>

        {/* Settings popover for analysis prompt */}
        <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Settings className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-3">
              <div className="font-medium">Folder Settings</div>
              <div className="space-y-2">
                <Label htmlFor="analysis-prompt" className="text-sm">Analysis Prompt</Label>
                <Textarea
                  id="analysis-prompt"
                  placeholder="Custom prompt for when analyzing bookmarks in this folder..."
                  value={analysisPrompt}
                  onChange={(e) => setAnalysisPrompt(e.target.value)}
                  rows={4}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Guide how Nefario should analyze bookmarks in this folder
                </p>
              </div>
              <Button size="sm" onClick={handleSavePrompt} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Future: Analyze folder button */}
        <Button variant="outline" size="sm" className="h-8" disabled>
          <Sparkles className="h-4 w-4 mr-1" />
          Analyze
        </Button>
      </div>
    </div>
  );
}
