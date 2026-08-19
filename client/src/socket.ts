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

export const socket: Socket = io(SOCKET_URL, {
  // Try WebSocket first, fall back to polling (important for Railway)
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  withCredentials: false,
});

// Development-only connection logging
if (import.meta.env.DEV) {
  socket.on('connect', () =>
    console.log('[Socket] ✅ Connected to server:', socket.id)
  );
  socket.on('disconnect', (reason) =>
    console.warn('[Socket] ❌ Disconnected:', reason)
  );
  socket.on('connect_error', (err) =>
    console.error('[Socket] Connection error:', err.message)
  );
}
