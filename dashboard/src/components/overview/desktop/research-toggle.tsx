'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';

export function ResearchToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    fetch('/api/research/status')
      .then((res) => res.json())
      .then((data) => setEnabled(data.status === 'on'));
  }, []);

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    fetch('/api/research/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: checked ? 'on' : 'off' }),
    });
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch id="research-toggle" checked={enabled} onCheckedChange={handleToggle} />
      <Label htmlFor="research-toggle">Research Agent</Label>
    </div>
  );
}
