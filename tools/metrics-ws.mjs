#!/usr/bin/env node

import { WebSocketServer } from 'ws';
import si from 'systeminformation';

const PORT = 3101;
const HOST = '127.0.0.1';

const wss = new WebSocketServer({ port: PORT, host: HOST });

let interval;

console.log(`Metrics WebSocket server started on ws://${HOST}:${PORT}`);

wss.on('connection', (ws) => {
  console.log('Client connected');

  if (!interval) {
    interval = setInterval(async () => {
      try {
        const [cpuLoad, mem] = await Promise.all([
          si.currentLoad(),
          si.mem(),
        ]);

        const data = {
          ts: Date.now(),
          cpu: parseFloat(cpuLoad.currentLoad.toFixed(2)),
          memUsed: mem.used,
          memTotal: mem.total,
          memPercent: parseFloat(((mem.used / mem.total) * 100).toFixed(2)),
        };

        const jsonData = JSON.stringify(data);
        wss.clients.forEach((client) => {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(jsonData);
          }
        });
      } catch (error) {
        console.error('Error fetching system information:', error);
      }
    }, 2000);
  }

  ws.on('close', () => {
    console.log('Client disconnected');
    if (wss.clients.size === 0) {
      clearInterval(interval);
      interval = null;
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

const gracefulShutdown = () => {
  console.log('\nShutting down gracefully...');
  clearInterval(interval);
  wss.close(() => {
    console.log('WebSocket server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
