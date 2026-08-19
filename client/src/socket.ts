import { io, Socket } from 'socket.io-client';

const getSocketUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    // Default backend port 3000 on current hostname
    return `${protocol}//${hostname}:3000`;
  }
  return 'http://localhost:3000';
};

export const socket: Socket = io(getSocketUrl(), {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 1000,
});
