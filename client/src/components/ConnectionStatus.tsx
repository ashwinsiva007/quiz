import React, { useState, useEffect, useRef } from 'react';
import { socket, isLiveMode } from '../socket';
import { Wifi, WifiOff } from 'lucide-react';

/**
 * Shows a reconnecting banner ONLY in live mode (Railway backend configured)
 * and ONLY after 5 seconds of being disconnected (avoids flash on page load).
 * In demo mode (no backend), this component renders nothing — no errors shown.
 */
export const ConnectionStatus: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const disconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // In demo mode there is no real socket — never show connection status
    if (!isLiveMode) return;

    const clearTimer = () => {
      if (disconnectTimer.current) {
        clearTimeout(disconnectTimer.current);
        disconnectTimer.current = null;
      }
    };

    const onConnect = () => {
      clearTimer();
      setShowBanner(false);
      setIsReconnecting(false);
    };

    const onDisconnect = () => {
      setIsReconnecting(false);
      // Only show banner after 5 seconds — hides brief network hiccups
      disconnectTimer.current = setTimeout(() => setShowBanner(true), 5000);
    };

    const onReconnectAttempt = () => setIsReconnecting(true);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    // Access socket.io manager safely (only on real socket)
    try {
      (socket as any).io?.on('reconnect_attempt', onReconnectAttempt);
    } catch (_) { /* ignore */ }

    return () => {
      clearTimer();
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      try {
        (socket as any).io?.off('reconnect_attempt', onReconnectAttempt);
      } catch (_) { /* ignore */ }
    };
  }, []);

  // Demo mode or connected — render nothing
  if (!isLiveMode || !showBanner) return null;

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-bold ${
        isReconnecting
          ? 'bg-amber-950/95 border-amber-500/50 text-amber-300'
          : 'bg-rose-950/95 border-rose-500/50 text-rose-300'
      }`}
    >
      {isReconnecting ? (
        <><Wifi className="w-4 h-4 animate-pulse" /> RECONNECTING…</>
      ) : (
        <><WifiOff className="w-4 h-4" /> CONNECTION LOST — Retrying…</>
      )}
    </div>
  );
};
