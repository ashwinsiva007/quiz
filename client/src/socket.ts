import { io, Socket } from 'socket.io-client';
import { socket as localEngine } from './gameEngine';

/**
 * Smart socket that works in two modes:
 *
 * ── DEMO MODE (default, Vercel with no backend) ──────────────────
 *   No VITE_SOCKET_URL set → uses local GameEngine (BroadcastChannel).
 *   Works perfectly for single-device demos, projector displays, etc.
 *   No errors, no connection warnings.
 *
 * ── LIVE MODE (Railway backend configured) ────────────────────────
 *   VITE_SOCKET_URL is set → uses real Socket.IO for 150+ students
 *   on separate devices. Set in Vercel: Settings → Env Vars.
 *   Example: VITE_SOCKET_URL=https://your-project.up.railway.app
 */
const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL as string) ?? '';

/** true = Railway backend connected, false = local demo engine */
export const isLiveMode = !!SOCKET_URL;

let _socket: typeof localEngine | Socket;

if (isLiveMode) {
  // LIVE: real Socket.IO → Railway backend
  _socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
    withCredentials: false,
  });

  if (import.meta.env.DEV) {
    (_socket as Socket).on('connect', () =>
      console.log('[Socket] ✅ Live mode — connected to Railway:', (_socket as Socket).id)
    );
    (_socket as Socket).on('disconnect', (reason) =>
      console.warn('[Socket] Disconnected:', reason)
    );
    (_socket as Socket).on('connect_error', (err) =>
      console.error('[Socket] Connection error:', err.message)
    );
  }
} else {
  // DEMO: local game engine — works on same device/browser
  _socket = localEngine;
  if (import.meta.env.DEV) {
    console.info('[Socket] Demo mode — using local game engine. Set VITE_SOCKET_URL for live events.');
  }
}

export const socket = _socket as Socket;
