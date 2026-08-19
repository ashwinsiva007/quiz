import { io, Socket } from 'socket.io-client';

export const getStoredBackendUrl = (): string => {
  if (typeof window !== 'undefined') {
    // 1. Check user-configured URL in localStorage
    const custom = localStorage.getItem('asi_backend_url');
    if (custom && custom.trim().length > 0) {
      return custom.trim();
    }

    // 2. Check environment variable (Vercel)
    const envUrl = (import.meta as any).env?.VITE_BACKEND_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
      return envUrl.trim();
    }

    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // 3. Local/LAN development
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.')
    ) {
      return `${protocol}//${hostname}:3000`;
    }

    // 4. Fallback for deployed domains: try localhost:3000 for local server hybrid testing
    return 'http://localhost:3000';
  }

  return 'http://localhost:3000';
};

export const socket: Socket = io(getStoredBackendUrl(), {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 2000,
  transports: ['websocket', 'polling'],
});

export const updateSocketBackendUrl = (newUrl: string) => {
  const cleanUrl = newUrl.trim();
  if (typeof window !== 'undefined') {
    localStorage.setItem('asi_backend_url', cleanUrl);
  }
  // Reconnect with new URL
  (socket.io as any).uri = cleanUrl;
  socket.disconnect().connect();
};
