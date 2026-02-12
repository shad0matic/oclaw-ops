
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, BarChart } from 'recharts';

interface DailyData {
  date: string;
  estimatedCost: number;
  actualCost: number;
}

interface AccuracyData {
  date: string;
  averageAccuracy: number;
}

interface CostByTierData {
    date: string;
    tier: number;
    totalCost: number;
}

interface SummaryStats {
  totalTasks: number;
  totalCost: number;
  averageAccuracy: number;
  estimatedSavings: number;
}

interface Filters {
    taskTypes: (string | null)[];
    models: (string | null)[];
}

interface CostLearningDashboardProps {
  initialData: {
    dailyData: DailyData[];
    accuracyData: AccuracyData[];
    costByTier: CostByTierData[];
    summaryStats: SummaryStats;
    filters: Filters;
  };
}

const TIER_COLORS: { [key: number]: string } = {
    1: '#22c55e', // green-500
    2: '#3b82f6', // blue-500
    3: '#eab308', // yellow-500
    4: '#f97316', // orange-500
    5: '#ef4444', // red-500
};

export function CostLearningDashboard({ initialData }: CostLearningDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const [days, setDays] = useState(searchParams.get('days') || '30');
  const [taskType, setTaskType] = useState(searchParams.get('taskType') || 'all');
  const [model, setModel] = useState(searchParams.get('model') || 'all');
  const [tier, setTier] = useState(searchParams.get('tier') || 'all');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (days) params.set('days', days);
      if (taskType && taskType !== 'all') params.set('taskType', taskType);
      if (model && model !== 'all') params.set('model', model);
      if (tier && tier !== 'all') params.set('tier', tier);
      
      const res = await fetch(`/api/costs/learning?${params.toString()}`);
      const newData = await res.json();
      setData(newData);
      setIsLoading(false);

      const newUrl = `${pathname}?${params.toString()}`;
      router.replace(newUrl, { scroll: false });
    };

    fetchData();
  }, [days, taskType, model, tier, pathname, router]);
  
  const formattedDailyData = data.dailyData.map(d => ({
      ...d,
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      delta: d.estimatedCost - d.actualCost,
  }));

  const formattedAccuracyData = data.accuracyData.map(d => ({
      ...d,
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  const formattedCostByTierData = data.costByTier.reduce((acc, curr) => {
    const date = new Date(curr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!acc[date]) {
      acc[date] = { date };
    }
    acc[date][`tier${curr.tier}`] = Number(curr.totalCost);
    return acc;
  }, {} as { [key: string]: any });

  return (
    <div className="space-y-6">
        <h2 className="text-2xl font-semibold tracking-tight">Price Analysis & Learning</h2>
      {/* Filters */}
      <div className="flex items-center space-x-2">
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last 365 days</SelectItem>
          </SelectContent>
        </Select>
        <Select value={taskType} onValueChange={setTaskType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Task Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Task Types</SelectItem>
            {data.filters.taskTypes.map(t => t && <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Models</SelectItem>
            {data.filters.models.map(m => m && <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tier} onValueChange={setTier}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            {[1,2,3,4,5].map(t => <SelectItem key={t} value={String(t)}>Tier {t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks Logged</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summaryStats.totalTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost (USD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.summaryStats.totalCost.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Estimation Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summaryStats.averageAccuracy.toFixed(2)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.summaryStats.estimatedSavings.toFixed(2)}</div>
             <p className="text-xs text-muted-foreground">vs. all on Opus 4.6</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Card>
          <CardHeader>
              <CardTitle>Estimated vs. Actual Cost</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
             <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={formattedDailyData} syncId="costTimeline">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="cost" />
                    <YAxis yAxisId="delta" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="cost" dataKey="estimatedCost" fill="#3b82f6" name="Estimated Cost" />
                    <Bar yAxisId="cost" dataKey="actualCost" fill="#22c55e" name="Actual Cost" />
                    <Line yAxisId="delta" type="monotone" dataKey="delta" stroke="#ef4444" name="Delta (Est - Actual)" strokeWidth={2} dot={false} />
                </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
      </Card>

        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                 <CardHeader>
                    <CardTitle>Accuracy Trend</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formattedAccuracyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="averageAccuracy" stroke="#8884d8" name="Avg. Accuracy" />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card>
                 <CardHeader>
                    <CardTitle>Cost By Tier</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={Object.values(formattedCostByTierData)} syncId="costTimeline">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="tier1" stackId="a" fill={TIER_COLORS[1]} name="Tier 1" />
                            <Bar dataKey="tier2" stackId="a" fill={TIER_COLORS[2]} name="Tier 2" />
                            <Bar dataKey="tier3" stackId="a" fill={TIER_COLORS[3]} name="Tier 3" />
                            <Bar dataKey="tier4" stackId="a" fill={TIER_COLORS[4]} name="Tier 4" />
                            <Bar dataKey="tier5" stackId="a" fill={TIER_COLORS[5]} name="Tier 5" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}

