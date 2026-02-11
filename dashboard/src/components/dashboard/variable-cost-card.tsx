
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

// Mock data for cost snapshots
const mockCostData = {
  total: 125.50,
  daily: Array.from({ length: 30 }, (_, i) => ({
    date: `2026-01-${i + 1}`,
    cost: Math.random() * 10,
    cumulative: (i + 1) * 4 + Math.random() * 10,
  })),
  projected: 150.75,
  tier: 'red',
};

const tierStyles = {
  green: {
    glowColor: 'hsl(142, 71%, 45%)', // green-500
    animationDuration: '2s',
  },
  orange: {
    glowColor: 'hsl(24, 95%, 53%)', // orange-500
    animationDuration: '1.5s',
  },
  red: {
    glowColor: 'hsl(0, 84%, 60%)', // red-500
    animationDuration: '1s',
  },
};

export function VariableCostCard() {
  const [data, setData] = useState(mockCostData);
  // In a real app, you'd fetch this data
  // useEffect(() => {
  //   fetch('/api/costs/variable?days=30')
  //     .then(res => res.json())
  //     .then(setData);
  // }, []);

  if (!data || data.total <= 0) {
    return null; // Don't render if no variable costs
  }

  const { total, daily, projected, tier } = data;
  const styles = tierStyles[tier];

  return (
    <Card
      className={cn('bg-zinc-900/50 border backdrop-blur-sm animate-cost-pulse')}
      style={{
        '--glow-color': styles.glowColor,
        borderColor: styles.glowColor,
        animationDuration: styles.animationDuration,
      }}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-zinc-400">API Burn</CardTitle>
          <div className="text-2xl font-bold text-white">€{total.toFixed(2)}</div>
        </div>
        <p className="text-xs text-zinc-500">Last 30 days</p>
      </CardHeader>
      <CardContent>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={styles.glowColor} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={styles.glowColor} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `€${value}`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b', // zinc-900
                  borderColor: '#3f3f46', // zinc-700
                }}
                labelStyle={{ color: '#ffffff' }}
              />
              <Area type="monotone" dataKey="cumulative" stroke={styles.glowColor} fillOpacity={1} fill="url(#costGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-center text-zinc-500 mt-2">
          Projected: ~€{projected.toFixed(2)} by month end
        </p>
      </CardContent>
    </Card>
  );
}
