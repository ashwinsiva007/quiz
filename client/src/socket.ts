import { io, Socket } from 'socket.io-client';

/**
 * Backend URL resolution strategy:
 * 1. VITE_BACKEND_URL env variable (set in Vercel / Railway deployment)
 * 2. If on localhost / LAN → connect to port 3000
 * 3. Fallback to current origin
 */
const getSocketUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_BACKEND_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim();
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.')
    ) {
      return `${protocol}//${hostname}:3000`;
    }

    return `${protocol}//${hostname}:3000`;
  }

  return 'http://localhost:3000';
};

export const socket: Socket = io(getSocketUrl(), {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling'],
});
