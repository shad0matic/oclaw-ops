
"use client"

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface TaskHeaderProps {
  task: {
    id: string;
    title: string;
    status: string;
    assignedAgent: { name: string };
    durationMs: number;
    actualCost: number;
    model: string;
  };
}

export function TaskHeader({ task }: TaskHeaderProps) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(task.id);
    toast.success("Task ID copied to clipboard");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{task.title}</span>
          <Badge>{task.status}</Badge>
        </CardTitle>
        <div 
          className="text-xs text-gray-500 mt-1 cursor-pointer"
          onClick={copyToClipboard}
        >
          ID: {task.id}
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">Agent</p>
          <p>{task.assignedAgent.name}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Duration</p>
          <p>{(task.durationMs / 1000).toFixed(2)}s</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Cost</p>
          <p>${task.actualCost.toFixed(4)}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Model</p>
          <p>{task.model}</p>
        </div>
      </CardContent>
    </Card>
  );
}
