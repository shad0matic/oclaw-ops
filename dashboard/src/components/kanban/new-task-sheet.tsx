"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Project } from "./types";
import { AgentAvatar } from "@/components/ui/agent-avatar";

interface NewTaskSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  projects: Project[];
}

export function NewTaskSheet({ isOpen, onOpenChange, projects }: NewTaskSheetProps) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(5);
  const [project, setProject] = useState("other");
  const [agentId, setAgentId] = useState<string | null>(null);

  const { data: agents = [] } = useQuery<{ agent_id: string; name: string }[]>({
    queryKey: ["agents"],
    queryFn: () => fetch("/api/agents").then((res) => res.json()),
  });

  const createTaskMutation = useMutation({
    mutationFn: async (newTask: any) => {
      const res = await fetch("/api/tasks/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      });
      if (!res.ok) throw new Error("Failed to create task");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-queue"] });
      onOpenChange(false);
    },
  });

  const handleSubmit = () => {
    createTaskMutation.mutate({
      title,
      description,
      priority,
      project,
      agent_id: agentId,
      status: 'queued',
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-xl bg-card/80 backdrop-blur-xl border-l-border overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Create New Task</SheetTitle>
        </SheetHeader>
        <div className="space-y-4">
          <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Task description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(p => (
              <Button key={p} variant={priority === p ? "default" : "outline"} onClick={() => setPriority(p)}>{p}</Button>
            ))}
          </div>
          <Select value={project} onValueChange={setProject}>
            <SelectTrigger>
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.icon} {p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={agentId || ""} onValueChange={setAgentId}>
            <SelectTrigger>
              <SelectValue placeholder="Assign an agent (optional)" />
            </SelectTrigger>
            <SelectContent>
              {agents.map(agent => (
                <SelectItem key={agent.agent_id} value={agent.agent_id}>
                  <div className="flex items-center gap-2">
                    <AgentAvatar agentId={agent.agent_id} size={20} />
                    <span>{agent.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <SheetFooter className="mt-6 pt-4 border-t border-border/50">
          <Button onClick={handleSubmit}>Create Task</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
