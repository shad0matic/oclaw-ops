"use client";

import { useState, useEffect, useRef } from 'react';

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

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        strokeWidth="2"
        className={strokeColor}
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
}

const MAX_DATA_POINTS = 150; // 5 minutes of data at 2s interval

export function LiveMetricsBar() {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'stale' | 'disconnected'>('connecting');
  const [latestData, setLatestData] = useState<MetricsData | null>(null);
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [memHistory, setMemHistory] = useState<number[]>([]);
  const ws = useRef<WebSocket | null>(null);
  const staleTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  const disconnectTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectTimer = useRef<NodeJS.Timeout | undefined>(undefined);

  const connect = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) return;
    
    // Use the current hostname, but force ws protocol. Handles both http and https.
    const wsUrl = `ws://${window.location.hostname}:3101`;
    ws.current = new WebSocket(wsUrl);
    console.log(`Metrics: connecting to ${wsUrl}`);

    ws.current.onopen = () => {
      console.log('Metrics: WebSocket connected');
    };

    ws.current.onmessage = (event) => {
      const data: MetricsData = JSON.parse(event.data);
      setStatus('connected');
      setLatestData(data);
      setCpuHistory(prev => [...prev.slice(-MAX_DATA_POINTS + 1), data.cpu]);
      setMemHistory(prev => [...prev.slice(-MAX_DATA_POINTS + 1), data.memPercent]);

      clearTimeout(staleTimer.current);
      clearTimeout(disconnectTimer.current);

      staleTimer.current = setTimeout(() => setStatus('stale'), 5000);
      disconnectTimer.current = setTimeout(() => setStatus('disconnected'), 10000);
    };

    ws.current.onclose = (event) => {
      console.log('Metrics: WebSocket disconnected', event.reason);
      setStatus('disconnected');
      clearTimeout(staleTimer.current);
      clearTimeout(disconnectTimer.current);
      if (!reconnectTimer.current) {
         reconnectTimer.current = setTimeout(connect, 3000);
      }
    };

    ws.current.onerror = (error) => {
      console.error('Metrics: WebSocket error:', error);
      ws.current?.close(); // This will trigger onclose and the reconnect logic
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
    switch (status) {
      case 'connected':
        return <StatusCircle className="h-3 w-3 text-green-500 animate-pulse" />;
      case 'stale':
        return <StatusCircle className="h-3 w-3 text-yellow-500" />;
      case 'disconnected':
      case 'connecting':
        return (
          <div className="flex items-center gap-2">
            <StatusCircle className="h-3 w-3 text-red-500" />
            <span className="text-red-500">conn lost</span>
          </div>
        );
    }
  };
  
  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  return (
    <div className="bg-card border-b border-border h-9 px-4 flex items-center justify-between text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        {statusDot()}
      </div>

      <div className="flex items-center gap-6">
        {latestData && (
          <>
            <div className="flex items-center gap-2">
              <span className="w-16 text-right">CPU {latestData.cpu.toFixed(0)}%</span>
              <Sparkline data={cpuHistory} lastValue={latestData.cpu}/>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-24 text-right">
                RAM {formatBytes(latestData.memUsed)} / {formatBytes(latestData.memTotal)}
              </span>
              <Sparkline data={memHistory} lastValue={latestData.memPercent}/>
            </div>
          </>
        )}
      </div>

      <div>{/* Right side placeholder */}</div>
    </div>
  );
}
