
'use client';

import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface Zombie {
  sessionId: string;
  agentName: string;
  heuristic: string;
}

interface ZombieAlertBannerProps {
  zombies: Zombie[];
}

export function ZombieAlertBanner({ zombies }: ZombieAlertBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!zombies || zombies.length === 0 || !isVisible) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTitle>🧟 Zombie Agent Alert!</AlertTitle>
      <AlertDescription>
        <p>
          {zombies.length} agent(s) are suspected of being zombies. They may be stuck in a loop or burning tokens without making progress.
        </p>
        <ul className="list-disc pl-5 mt-2">
          {zombies.map((zombie) => (
            <li key={zombie.sessionId}>
              <strong>{zombie.agentName}</strong> (Heuristic: {zombie.heuristic})
            </li>
          ))}
        </ul>
      </AlertDescription>
      <Button onClick={() => setIsVisible(false)} variant="outline" size="sm" className="mt-4">
        Dismiss
      </Button>
    </Alert>
  );
}
