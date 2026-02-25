"use client"

import React from 'react';
import { cn } from "@/lib/utils"

interface ServerLoadGaugeProps {
  load?: number;
  cores?: number;
  compact?: boolean;
}

/**
 * Server load gauge for mobile display
 * Shows a progress bar with color coding based on load relative to cores
 * and displays the numeric load value
 */
const ServerLoadGauge: React.FC<ServerLoadGaugeProps> = ({ 
  load = 0, 
  cores = 1,
  compact = false 
}) => {
  // Calculate load as percentage of cores (load > cores means overloaded)
  const percentage = Math.min((load / cores) * 100, 100);
  
  // Color based on load thresholds relative to cores
  // Green: load < 0.7 * cores (70% of capacity)
  // Yellow: load 70-100% of cores
  // Red: load > cores (overloaded)
  const getColorClass = (pct: number, l: number, c: number) => {
    const loadRatio = l / c;
    if (loadRatio > 1) return 'bg-red-500';
    if (loadRatio > 0.7) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const colorClass = getColorClass(percentage, load, cores);
  const loadDisplay = load.toFixed(1);

  if (compact) {
    // Compact mode: just show the value with colored indicator
    return (
      <span className={cn(
        "tabular-nums font-medium",
        load / cores > 1 ? "text-red-500" : load / cores > 0.7 ? "text-yellow-500" : "text-green-500"
      )}>
        {loadDisplay}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 overflow-hidden">
        <div
          className={cn("h-2.5 rounded-full transition-all duration-300", colorClass)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={cn(
        "text-xs tabular-nums font-medium min-w-[2.5rem] text-right",
        load / cores > 1 ? "text-red-500" : load / cores > 0.7 ? "text-yellow-500" : "text-muted-foreground"
      )}>
        {loadDisplay}
      </span>
    </div>
  );
};

export default ServerLoadGauge;
