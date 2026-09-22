import type { WebSocket } from 'ws';
import { getSession } from '../services/sessionService.js';
import { streamTutorSpeech } from '../services/ai/geminiLiveSpeech.js';

export type WsClientMessage =
  | { type: 'join'; sessionId: string; userId: string }
  | {
      type: 'stroke';
      sessionId: string;
      stroke: {
        color: string;
        width: number;
        points: Array<{ x: number; y: number }>;
      };
    }
  | { type: 'clear'; sessionId: string }
  | { type: 'canvas_commands'; sessionId: string; commands: unknown[] }
  | { type: 'phase'; sessionId: string; phase: string }
  | {
      type: 'speak_stream';
      sessionId: string;
      text: string;
      voice?: string;
    };

type ClientMeta = {
  userId: string;
  sessionId: string;
};

const rooms = new Map<string, Set<WebSocket>>();
const clientMeta = new WeakMap<WebSocket, ClientMeta>();

function roomKey(sessionId: string) {
  return sessionId;
}

function broadcast(sessionId: string, payload: unknown, except?: WebSocket) {
  const room = rooms.get(roomKey(sessionId));
  if (!room) return;
  const text = JSON.stringify(payload);
  for (const client of room) {
    if (client !== except && client.readyState === 1) {
      client.send(text);
    }
  }
}

function send(ws: WebSocket, payload: unknown) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(payload));
  }
}

export async function handleWsMessage(ws: WebSocket, raw: string) {
  let msg: WsClientMessage;
  try {
    msg = JSON.parse(raw) as WsClientMessage;
  } catch {
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
    return;
  }

  if (msg.type === 'join') {
    try {
      await getSession(msg.sessionId, msg.userId);
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Session access denied' }));
      return;
    }

    const key = roomKey(msg.sessionId);
    if (!rooms.has(key)) rooms.set(key, new Set());
    rooms.get(key)!.add(ws);
    clientMeta.set(ws, { userId: msg.userId, sessionId: msg.sessionId });

    ws.send(JSON.stringify({ type: 'joined', sessionId: msg.sessionId }));
    return;
  }

  const meta = clientMeta.get(ws);
  if (!meta || meta.sessionId !== msg.sessionId) {
    ws.send(JSON.stringify({ type: 'error', message: 'Join session first' }));
    return;
  }

  switch (msg.type) {
    case 'stroke':
      broadcast(msg.sessionId, { type: 'stroke', stroke: msg.stroke }, ws);
      break;
    case 'clear':
      broadcast(msg.sessionId, { type: 'clear' }, ws);
      break;
    case 'canvas_commands':
      broadcast(
        msg.sessionId,
        { type: 'canvas_commands', commands: msg.commands },
        ws,
      );
      break;
    case 'phase':
      broadcast(msg.sessionId, { type: 'phase', phase: msg.phase }, ws);
      break;
    case 'speak_stream': {
      const text = typeof msg.text === 'string' ? msg.text.trim() : '';
      if (!text) {
        send(ws, { type: 'error', message: 'Empty speak text' });
        break;
      }
      send(ws, { type: 'speak_started', sessionId: msg.sessionId });
      try {
        const { engine } = await streamTutorSpeech(
          text,
          (ev) => {
            send(ws, {
              type: 'audio_chunk',
              sessionId: msg.sessionId,
              mimeType: ev.mimeType,
              audioBase64: ev.audioBase64,
              index: ev.index,
              done: ev.done,
              text: ev.text,
            });
          },
          {
            voice: typeof msg.voice === 'string' ? msg.voice : undefined,
            sessionId:
              typeof msg.sessionId === 'string' ? msg.sessionId : undefined,
          },
        );
        send(ws, {
          type: 'speak_done',
          sessionId: msg.sessionId,
          engine,
        });
      } catch (err) {
        send(ws, {
          type: 'speak_error',
          message: err instanceof Error ? err.message : 'Speech failed',
        });
      }
      break;
    }
    default:
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown type' }));
  }
}

export function handleWsClose(ws: WebSocket) {
  const meta = clientMeta.get(ws);
  if (!meta) return;
  const room = rooms.get(roomKey(meta.sessionId));
  room?.delete(ws);
  if (room?.size === 0) rooms.delete(roomKey(meta.sessionId));
}
