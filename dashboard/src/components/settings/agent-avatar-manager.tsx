
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Mock data for agents and avatars - replace with API calls
const mockAgents = [
  { id: 'kevin', name: 'Kevin', avatar: '' },
  { id: 'bob', name: 'Bob', avatar: '' },
  { id: 'stuart', name: 'Stuart', avatar: '' },
];

const mockAvatars = ['kevin.webp', 'bob.webp', 'stuart.webp', 'nefario.webp'];

export function AgentAvatarManager() {
  const [agents, setAgents] = useState(mockAgents);
  const [avatars, setAvatars] = useState(mockAvatars);

  // In a real app, you would fetch agents and avatars from your API
  // useEffect(() => {
  //   // fetch('/api/agents').then(res => res.json()).then(setAgents);
  //   // fetch('/api/avatars/library').then(res => res.json()).then(setAvatars);
  // }, []);

  const handleAvatarChange = (agentId, avatar) => {
    setAgents(agents.map(agent => 
      agent.id === agentId ? { ...agent, avatar } : agent
    ));
    // Here you would also make an API call to save the change
    // fetch(`/api/agents/${agentId}/avatar`, {
    //   method: 'POST',
    //   body: JSON.stringify({ avatar }),
    // });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Avatar Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {agents.map((agent) => (
          <div key={agent.id} className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src={`/assets/minion-avatars/${agent.avatar}`} />
                <AvatarFallback>{agent.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span>{agent.name}</span>
            </div>
            <Select
              value={agent.avatar}
              onValueChange={(value) => handleAvatarChange(agent.id, value)}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select avatar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {avatars.map((avatar) => (
                  <SelectItem key={avatar} value={avatar}>
                    {avatar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
