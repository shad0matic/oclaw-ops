
'use client';

import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface ZombieActionsProps {
  sessionId: string;
}

export function ZombieActions({ sessionId }: ZombieActionsProps) {
  const router = useRouter();

  const handleKill = async () => {
    const res = await fetch(`/api/agents/zombies/kill/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Manual override by operator' }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(data.message);
      router.refresh();
    } else {
      toast.error(data.error);
    }
  };

  const handlePardon = async () => {
    const res = await fetch(`/api/agents/zombies/pardon/${sessionId}`, {
      method: 'POST',
    });
    const data = await res.json();
    if (data.success) {
      toast.success(data.message);
      router.refresh();
    } else {
      toast.error(data.error);
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="destructive" size="sm" onClick={handleKill}>
        Kill
      </Button>
      <Button variant="outline" size="sm" onClick={handlePardon}>
        Pardon
      </Button>
    </div>
  );
}
