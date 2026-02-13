
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AgentProfile {
  agent_id: string;
  name: string;
  emoji: string;
  model: string;
  description: string;
}

const allModels = [
  "claude-opus-4-6",
  "claude-opus-4-5",
  "claude-sonnet-4-5",
  "claude-haiku-4-5",
  "gpt-5.2",
  "gpt-5.3-codex",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "grok-3",
  "grok-4-fast",
];

export function AgentModelAssignment() {
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  

  useEffect(() => {
    async function fetchAgents() {
      try {
        const response = await fetch("/api/settings/agents");
        if (!response.ok) {
          throw new Error("Failed to fetch agents");
        }
        const data = await response.json();
        setAgents(data);
      } catch (error) {
        console.error(error);
        toast.error("Could not fetch agent profiles.");
      } finally {
        setLoading(false);
      }
    }
    fetchAgents();
  }, [toast]);

  const handleModelChange = async (agentId: string, model: string) => {
    const originalAgents = [...agents];
    const updatedAgents = agents.map((agent) =>
      agent.agent_id === agentId ? { ...agent, model } : agent
    );
    setAgents(updatedAgents);

    try {
      const response = await fetch("/api/settings/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, model }),
      });

      if (!response.ok) {
        throw new Error("Failed to update model");
      }

      toast.success(`Model for agent ${agentId} updated to ${model}.`);
    } catch (error) {
      console.error(error);
      setAgents(originalAgents);
      toast.error("Failed to update model. Please try again.");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Model Assignment</CardTitle>
        <CardDescription>
          Assign different models to each agent.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {agents.map((agent) => (
          <div key={agent.agent_id} className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-2xl">{agent.emoji}</span>
              <div>
                <p className="font-medium">{agent.name}</p>
                <p className="text-sm text-muted-foreground">{agent.agent_id}</p>
              </div>
            </div>
            <div className="w-64">
              <Select
                value={agent.model}
                onValueChange={(value) => handleModelChange(agent.agent_id, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {allModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
