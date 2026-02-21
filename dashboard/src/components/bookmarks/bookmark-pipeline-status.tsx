"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Play, RefreshCw, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface PipelineStats {
  total: number;
  pending: number;
  alive: number;
  dead: number;
  redirect: number;
  error: number;
  summarized: number;
}

interface ProcessingResult {
  validated: number;
  scraped: number;
  summarized: number;
  readyForCategorization: number;
}

export function BookmarkPipelineStatus() {
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lastRun, setLastRun] = useState<ProcessingResult | null>(null);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/browser-bookmarks?limit=1');
      const data = await response.json();
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      toast.error('Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const runPipeline = async () => {
    setProcessing(true);
    try {
      const response = await fetch('/api/browser-bookmarks/process', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setLastRun(data.totals);
        toast.success('Pipeline completed', {
          description: `Validated: ${data.totals.validated}, Scraped: ${data.totals.scraped}, Summarized: ${data.totals.summarized}`,
        });
        await fetchStats();
      } else {
        throw new Error(data.error || 'Pipeline failed');
      }
    } catch (error) {
      console.error('Pipeline error:', error);
      toast.error('Pipeline failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.total === 0) {
    return null;
  }

  const pendingWork = stats.pending + (stats.alive - stats.summarized);
  const progress = stats.total > 0 ? ((stats.summarized / stats.total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Bookmark Processing Pipeline</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStats}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={runPipeline}
              disabled={processing || pendingWork === 0}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run Pipeline
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Background processing: validation → scraping → summarization → categorization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Alive</p>
            <p className="text-2xl font-bold text-green-500">{stats.alive}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Summarized</p>
            <p className="text-2xl font-bold text-cyan-500">{stats.summarized}</p>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          {stats.dead > 0 && (
            <Badge variant="destructive">
              ✗ Dead: {stats.dead}
            </Badge>
          )}
          {stats.redirect > 0 && (
            <Badge variant="outline" className="border-orange-500 text-orange-500">
              ↗ Redirect: {stats.redirect}
            </Badge>
          )}
          {stats.error > 0 && (
            <Badge variant="outline" className="border-red-500 text-red-500">
              ! Error: {stats.error}
            </Badge>
          )}
        </div>

        {/* Last Run */}
        {lastRun && (
          <div className="pt-2 border-t text-sm">
            <p className="text-muted-foreground mb-1">Last run:</p>
            <div className="flex gap-4 text-xs">
              <span>✓ Validated: {lastRun.validated}</span>
              <span>📄 Scraped: {lastRun.scraped}</span>
              <span>📝 Summarized: {lastRun.summarized}</span>
            </div>
          </div>
        )}

        {/* Pending Work Info */}
        {pendingWork > 0 && (
          <div className="text-xs text-muted-foreground">
            {stats.pending > 0 && <p>• {stats.pending} bookmarks need validation</p>}
            {stats.alive - stats.summarized > 0 && (
              <p>• {stats.alive - stats.summarized} bookmarks need scraping/summarization</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
