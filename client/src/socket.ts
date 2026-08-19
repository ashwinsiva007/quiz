import { io, Socket } from 'socket.io-client';

/**
 * Real Socket.IO client — connects to the Railway backend server.
 *
 * ─────────────────────────────────────────────────
 * PRODUCTION (Vercel):
 *   Set VITE_SOCKET_URL in your Vercel project settings:
 *   Settings → Environment Variables → VITE_SOCKET_URL
 *   Value: https://your-project.up.railway.app
 *
 * LOCAL DEV:
 *   Leave VITE_SOCKET_URL unset (or set to empty string).
 *   Vite proxy in vite.config.ts routes /socket.io → localhost:3000.
 * ─────────────────────────────────────────────────
 */
const SOCKET_URL: string = (import.meta.env.VITE_SOCKET_URL as string) ?? '';
const isProduction = import.meta.env.PROD;

// In production with no server URL configured, don't attempt connection at all
// (prevents infinite reconnect attempts that flood browser console)
const shouldConnect = !isProduction || !!SOCKET_URL;

export const socket: Socket = io(SOCKET_URL, {
  // Try WebSocket first, fall back to long-polling (required for Railway)
  transports: ['websocket', 'polling'],
  autoConnect: shouldConnect,
  reconnection: shouldConnect,
  reconnectionAttempts: shouldConnect ? Infinity : 0,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,
  timeout: 20000,
  withCredentials: false,
});

// Development-only connection logging
if (import.meta.env.DEV) {
  socket.on('connect', () =>
    console.log('[Socket] ✅ Connected:', socket.id, '→', SOCKET_URL || 'same-origin (Vite proxy)')
  );
  socket.on('disconnect', (reason) =>
    console.warn('[Socket] ❌ Disconnected:', reason)
  );
  socket.on('connect_error', (err) =>
    console.error('[Socket] Connection error:', err.message)
  );
}
