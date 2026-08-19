import { io, Socket } from 'socket.io-client';

/**
 * Backend URL resolution strategy:
 * 1. VITE_BACKEND_URL env variable (set in Vercel / Railway deployment)
 * 2. If on localhost → connect to localhost:3000
 * 3. On any deployed domain → assumes Railway backend URL from env
 */
const getSocketUrl = (): string => {
  // Env variable takes top priority (set in Vercel dashboard → Settings → Environment Variables)
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL as string;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // Local development: connect to localhost backend
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168') || hostname.startsWith('10.')) {
      return `${protocol}//${hostname}:3000`;
    }

    // Deployed on Vercel: Use VITE_BACKEND_URL env variable
    // Fallback: try same host with port 3000 (won't work on Vercel, but won't crash)
    return `${protocol}//${hostname}:3000`;
  }

  return 'http://localhost:3000';
};

export const socket: Socket = io(getSocketUrl(), {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling'], // WebSocket first, polling fallback
});
