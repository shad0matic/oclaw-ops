"use client"

import React from 'react';
import { cn } from "@/lib/utils"

interface ServerLoadGaugeProps {
  load: number;
}

const ServerLoadGauge: React.FC<ServerLoadGaugeProps> = ({ load }) => {
  const percentage = Math.min(load * 10, 100); // Assuming load average * 10 for percentage
  const colorClass = percentage > 80 ? 'bg-red-500' : percentage > 50 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
      <div
        className={cn("h-2.5 rounded-full", colorClass)}
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};

export default ServerLoadGauge;
