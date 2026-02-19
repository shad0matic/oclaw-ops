"use client"

import { useState, useEffect, useRef } from 'react';
import { AgentStatusDot } from "../shared/agent-status-dot"
import { CostDisplay } from "../shared/cost-display"
import { cn } from "@/lib/utils"
import { MiniGauge } from "./mini-gauge"

// --- Merged from LiveMetricsBar ---

// Simplified version of lucide-react circle
const StatusCircle = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
  </svg>
);

const Sparkline = ({
  data,
  width = 120,
  height = 24,
  lastValue,
}: {
  data: number[];
  width?: number;
  height?: number;
  lastValue: number;
}) => {
  if (data.length < 2) {
    return <div style={{ width, height }} className="bg-muted/20 rounded-sm" />;
  }

  const maxVal = 100;
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (Math.min(d, maxVal) / maxVal) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  const strokeColor = lastValue > 90 ? 'stroke-red-500' : lastValue > 70 ? 'stroke-yellow-500' : 'stroke-green-500';
  const gradientId = `sparkline-gradient-${Math.random().toString(36).substring(7)}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        strokeWidth="2"
        className={cn("transition-all", strokeColor)}
      />
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#${gradientId})`}
        className={cn("transition-all", strokeColor.replace('stroke-', 'text-'))}
      />
    </svg>
  );
};

interface MetricsData {
  ts: number;
  cpu: number;
  memUsed: number;
  memTotal: number;
  memPercent: number;
  load: number[];
  cores: number;
}

const MAX_DATA_POINTS = 150; // 5 minutes of data at 2s interval

// --- End of Merged Code ---


export interface StatusBarProps {
  status: 'online' | 'offline' | 'degraded'
  uptime: number
  dashboardUptime?: number
  activeCount: number
  dailyCost: number
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const mins = Math.floor((seconds % 3600) / 60)
  const hours = Math.floor(seconds / 3600)
  const days = Math.floor(hours / 24)
  
  // >48h: show days only
  if (hours >= 48) return `${days}d`
  // >6h: show rounded hours only
  if (hours >= 6) return `${hours}h`
  // <6h: show hours and minutes
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function StatusBar({
  status,
  uptime,
  dashboardUptime,
  activeCount,
  dailyCost
}: StatusBarProps) {
  const statusText = status === 'online'
    ? `🖥 ${formatUptime(uptime)}${dashboardUptime != null ? ` · 🔲 ${formatUptime(dashboardUptime)}` : ''}`
    : status
  
  // --- WebSocket Logic from LiveMetricsBar ---
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'stale' | 'disconnected'>('connecting');
  const [latestData, setLatestData] = useState<MetricsData | null>(null);
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [memHistory, setMemHistory] = useState<number[]>([]);
  const [loadHistory, setLoadHistory] = useState<number[]>([]);
  const ws = useRef<WebSocket | null>(null);
  const staleTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  const disconnectTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectTimer = useRef<NodeJS.Timeout | undefined>(undefined);

  const connect = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) return;
    if (typeof window === 'undefined') return;

    // Use wss:// when page is loaded over HTTPS, connect to metrics WebSocket server
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.hostname}:3101`;
    try {
      ws.current = new WebSocket(wsUrl);
    } catch (e) {
      setWsStatus('disconnected');
      return;
    }

    ws.current.onopen = () => {
      setWsStatus('connected');
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = undefined;
    };

    ws.current.onmessage = (event) => {
      const data: MetricsData = JSON.parse(event.data);
      setWsStatus('connected');
      setLatestData(data);
      setCpuHistory(prev => [...prev.slice(-MAX_DATA_POINTS + 1), data.cpu]);
      setMemHistory(prev => [...prev.slice(-MAX_DATA_POINTS + 1), data.memPercent]);
      setLoadHistory(prev => [...prev.slice(-MAX_DATA_POINTS + 1), (data.load[0] / data.cores) * 100]);

      clearTimeout(staleTimer.current);
      clearTimeout(disconnectTimer.current);

      staleTimer.current = setTimeout(() => setWsStatus('stale'), 5000);
      disconnectTimer.current = setTimeout(() => setWsStatus('disconnected'), 10000);
    };

    ws.current.onclose = () => {
      setWsStatus('disconnected');
      clearTimeout(staleTimer.current);
      clearTimeout(disconnectTimer.current);
      if (!reconnectTimer.current) {
         reconnectTimer.current = setTimeout(connect, 3000);
      }
    };

    ws.current.onerror = () => {
      ws.current?.close();
    };
  };

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(staleTimer.current);
      clearTimeout(disconnectTimer.current);
      clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, []);

  const statusDot = () => {
    switch (wsStatus) {
      case 'connected':
        return <StatusCircle className="h-3 w-3 text-green-500 animate-pulse" />;
      case 'stale':
        return <StatusCircle className="h-3 w-3 text-yellow-500" />;
      case 'disconnected':
      case 'connecting':
        return (
          <div className="flex items-center gap-2">
            <StatusCircle className="h-3 w-3 text-red-500" />
            <span className="text-xs text-red-500/80">conn lost</span>
          </div>
        );
    }
  };
  // --- End of WebSocket Logic ---

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 flex h-12 items-center gap-4 border-b border-border bg-card/80 px-4 text-sm backdrop-blur-sm"
    >
      {/* WS Connection Status */}
      <div className="flex h-full w-28 items-center justify-center border-r border-border pr-4">
        {statusDot()}
      </div>

      {/* System Status */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground">
          {statusText}
        </span>
      </div>

      <div className="h-4 w-px bg-border" />

      {/* Active Count */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground font-medium">{activeCount}</span>
        <span className="text-sm text-muted-foreground">active</span>
      </div>

      <div className="h-4 w-px bg-border" />

      {/* Daily Cost */}
      <div className="flex items-center gap-2">
        <CostDisplay cost={dailyCost} className="text-sm" />
        <span className="text-sm text-muted-foreground">today</span>
      </div>

      {/* Spacer to push metrics and toggle to the right */}
      <div className="flex-grow" />

      {/* System Resources — Gauges + Sparklines */}
      {latestData && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MiniGauge value={latestData.load[0]} label="Load" size={44} type="raw" max={latestData.cores} />
              <Sparkline data={loadHistory} lastValue={(latestData.load[0] / latestData.cores) * 100} width={100} height={20}/>
            </div>
            <div className="flex items-center gap-1.5">
              <MiniGauge
                value={latestData.memPercent}
                label="RAM"
                detail={`${formatBytes(latestData.memUsed, 0)}/${formatBytes(latestData.memTotal, 0)}`}
                size={44}
              />
              <Sparkline data={memHistory} lastValue={latestData.memPercent} width={100} height={20}/>
            </div>
        </div>
      )}

    </div>
  )
}
