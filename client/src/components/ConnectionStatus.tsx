import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { Wifi, WifiOff } from 'lucide-react';

/**
 * Global connection status overlay.
 * Shows a "Reconnecting…" banner when the Socket.IO connection is lost.
 * Invisible when connected normally.
 */
export const ConnectionStatus: React.FC = () => {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>(
    socket.connected ? 'connected' : 'disconnected'
  );

  useEffect(() => {
    const onConnect = () => setStatus('connected');
    const onDisconnect = () => setStatus('disconnected');
    const onReconnectAttempt = () => setStatus('reconnecting');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.io.on('reconnect_attempt', onReconnectAttempt);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
    };
  }, []);

  if (status === 'connected') return null;

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-bold transition-all ${
        status === 'reconnecting'
          ? 'bg-amber-950/95 border-amber-500/50 text-amber-300'
          : 'bg-rose-950/95 border-rose-500/50 text-rose-300'
      }`}
    >
      {status === 'reconnecting' ? (
        <>
          <Wifi className="w-4 h-4 animate-pulse" />
          RECONNECTING…
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          CONNECTION LOST — Retrying…
        </>
      )}
    </div>
  );
};
