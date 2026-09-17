import type { Server } from 'node:http';
import { WebSocketServer } from 'ws';
import { handleWsClose, handleWsMessage } from './sessionHub.js';

export function attachWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.on('message', (data) => {
      const raw = typeof data === 'string' ? data : data.toString('utf8');
      void handleWsMessage(ws, raw);
    });
    ws.on('close', () => handleWsClose(ws));
  });

  console.log('[ws] attached at /ws');
  return wss;
}
