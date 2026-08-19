import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';

/**
 * Global connection status overlay.
 *
 * - Hidden while connected (normal state)
 * - Shows a "Reconnecting…" banner only AFTER 4 seconds of being disconnected
 *   (avoids flashing on initial page load while the connection is being established)
 * - Shows a config warning in production when VITE_SOCKET_URL is not set
 */
export const ConnectionStatus: React.FC = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [showBanner, setShowBanner] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const disconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isProduction = import.meta.env.PROD;
  const hasServerUrl = !!(import.meta.env.VITE_SOCKET_URL as string);

  // Clear the delayed-show timer on connect
  const clearDisconnectTimer = () => {
    if (disconnectTimer.current) {
      clearTimeout(disconnectTimer.current);
      disconnectTimer.current = null;
    }
  };

  useEffect(() => {
    const onConnect = () => {
      clearDisconnectTimer();
      setIsConnected(true);
      setShowBanner(false);
      setIsReconnecting(false);
    };

    const onDisconnect = () => {
      setIsConnected(false);
      setIsReconnecting(false);
      // Only show the banner after 4 seconds — avoids flash on initial page load
      disconnectTimer.current = setTimeout(() => setShowBanner(true), 4000);
    };

    const onReconnectAttempt = () => {
      setIsReconnecting(true);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.io.on('reconnect_attempt', onReconnectAttempt);

    return () => {
      clearDisconnectTimer();
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
    };
  }, []);

  // In production without VITE_SOCKET_URL set, show a configuration warning
  if (isProduction && !hasServerUrl && !isConnected) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border bg-slate-900/95 border-slate-600 text-slate-300 text-xs font-semibold max-w-sm text-center">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          Backend not configured.{' '}
          Set <code className="text-amber-400 font-mono">VITE_SOCKET_URL</code> in Vercel settings.
        </span>
      </div>
    );
  }

  // Only show the reconnecting banner after the delay has elapsed
  if (!showBanner || isConnected) return null;

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-bold transition-all ${
        isReconnecting
          ? 'bg-amber-950/95 border-amber-500/50 text-amber-300'
          : 'bg-rose-950/95 border-rose-500/50 text-rose-300'
      }`}
    >
      {isReconnecting ? (
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
