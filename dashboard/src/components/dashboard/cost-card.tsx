// @ts-nocheck

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { DollarSign, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CostData {
  total: number;
  daily: { date: string; cost: number; cumulative: number }[];
  projected: number;
  tier: 'green' | 'orange' | 'red';
}

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

export function CostCard() {
  const [data, setData] = useState<CostData | null>(null);
  const [xaiBalance, setXaiBalance] = useState<number | null>(null);
  const [balanceMessage, setBalanceMessage] = useState<string>("Not checked yet");
  const [checkingBalance, setCheckingBalance] = useState<boolean>(false);

  useEffect(() => {
    const fetchCosts = async () => {
        try {
            const res = await fetch("/api/costs/variable?days=30")
            if (res.ok) {
              const fetchedData = await res.json();
              if(fetchedData.total > 0) {
                setData(fetchedData);
              } else {
                setData(null);
              }
            }
        } catch {}
    }
    fetchCosts();
    
    const fetchXaiBalance = async () => {
        try {
            const res = await fetch("/api/costs/xai-balance")
            if (res.ok) {
                const balanceData = await res.json();
                if (balanceData.ok && balanceData.balance !== null) {
                    setXaiBalance(balanceData.balance);
                    setBalanceMessage(balanceData.message);
                } else {
                    setBalanceMessage(balanceData.error || "Failed to fetch balance");
                }
            }
        } catch {
            setBalanceMessage("Network error while checking balance");
        }
    }
    fetchXaiBalance();
    
    // Auto-refresh costs every 5 minutes
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchCosts();
      }
    }, 300000);
    // Auto-refresh balance every hour
    const balanceInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchXaiBalance();
      }
    }, 3600000);
    return () => {
      clearInterval(interval);
      clearInterval(balanceInterval);
    };
  }, [])

  const checkBalanceNow = async () => {
    setCheckingBalance(true);
    try {
      const res = await fetch("/api/costs/xai-balance")
      if (res.ok) {
        const balanceData = await res.json();
        if (balanceData.ok && balanceData.balance !== null) {
          setXaiBalance(balanceData.balance);
          setBalanceMessage(balanceData.message);
        } else {
          setBalanceMessage(balanceData.error || "Failed to fetch balance");
        }
      } else {
        setBalanceMessage("Failed to fetch balance");
      }
    } catch {
      setBalanceMessage("Network error while checking balance");
    } finally {
      setCheckingBalance(false);
    }
  };

  if (!data) {
    return null;
  }

  const { total, daily, projected, tier } = data;
  const styles = tierStyles[tier];

  return (
    <Card
      className={cn('bg-zinc-900/50 border backdrop-blur-sm animate-cost-pulse')}
      style={{
        ['--glow-color' as any]: styles.glowColor,
        borderColor: styles.glowColor,
        animationDuration: styles.animationDuration,
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-zinc-400 text-sm font-medium"><Link href="/costs" className="hover:text-zinc-200 transition-colors">💸 API Costs (30d)</Link></CardTitle>
          <div className="flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5 text-zinc-500" />
            <Button
              variant="outline"
              size="sm"
              onClick={checkBalanceNow}
              disabled={checkingBalance}
              className="h-7 text-xs border-zinc-700 hover:bg-zinc-800"
            >
              <RefreshCcw className="h-3 w-3 mr-1" />
              {checkingBalance ? "Checking..." : "Check xAI Now"}
            </Button>
          </div>
        </div>
        <div className="mt-1 text-xs text-zinc-500">
          xAI Balance: {xaiBalance !== null ? `$${xaiBalance}` : balanceMessage}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={styles.glowColor} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={styles.glowColor} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(str) => new Date(str).getDate().toString()} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `€${value}`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b', // zinc-900
                  borderColor: '#3f3f46', // zinc-700
                }}
                labelStyle={{ color: '#ffffff' }}
                formatter={(value: any, name: any) => [`€${Number(value).toFixed(2)}`, name.charAt(0).toUpperCase() + name.slice(1)]}
              />
              <Area type="monotone" dataKey="cumulative" stroke={styles.glowColor} fillOpacity={1} fill="url(#costGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-center mt-2" style={{ color: styles.glowColor }}>
          Projected: ~€{projected.toFixed(2)} by month end
        </p>
      </CardContent>
    </Card>
  );
}
