'use client';

import React from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const KnowledgeHeader = () => {
  const { data: stats, mutate } = useSWR('/api/knowledge/queue/status', fetcher, {
    refreshInterval: 5000,
  });

  const handleQueueAll = async () => {
    const res = await fetch('/api/knowledge/queue/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allUnprocessed: true }),
    });
    if (res.ok) {
      const data = await res.json();
      toast.success(`Queued ${data.count} unprocessed bookmarks.`);
      mutate();
    } else {
      toast.error('Failed to queue bookmarks.');
    }
  };

  const handleClearQueue = async () => {
    const res = await fetch('/api/knowledge/queue/clear', {
      method: 'POST',
    });
    if (res.ok) {
      toast.success('Cleared completed and failed items from the queue.');
      mutate();
    } else {
      toast.error('Failed to clear queue.');
    }
  };

  const handleProcessQueue = async () => {
    const res = await fetch('/api/knowledge/queue/process', {
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json();
      toast.success(`Processed ${data.processed} items.`);
      mutate();
    } else {
      toast.error('Failed to process queue.');
    }
  };

  return (
    <div className="flex justify-between items-center mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <div>
        <h2 className="text-lg font-semibold">Processing Queue</h2>
        {stats ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {stats.pending} pending / {stats.processing} processing / {stats.done} done / {stats.failed} failed
          </p>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading stats...</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={handleProcessQueue}>Process Now</Button>
        <Button onClick={handleQueueAll}>Queue All Unprocessed</Button>
        <Button onClick={handleClearQueue} variant="outline">Clear Queue</Button>
      </div>
    </div>
  );
};

export default KnowledgeHeader;
