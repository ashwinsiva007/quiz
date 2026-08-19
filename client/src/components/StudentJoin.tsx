import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { BrandingHeader } from './BrandingHeader';
import { LogIn, Sparkles, AlertCircle, Play, QrCode } from 'lucide-react';

interface StudentJoinProps {
  onJoined: (pin: string, name: string) => void;
}

export const StudentJoin: React.FC<StudentJoinProps> = ({ onJoined }) => {
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanned, setIsScanned] = useState(false);

  useEffect(() => {
    // Check URL parameters for ?pin=XXXXXX
    const urlParams = new URLSearchParams(window.location.search);
    const pinParam = urlParams.get('pin');
    if (pinParam && pinParam.trim().length > 0) {
      setPin(pinParam.trim());
      setIsScanned(true);
    }
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPin = pin.trim() || '123456';
    const cleanName = name.trim() || `Player ${Math.floor(100 + Math.random() * 900)}`;

    setIsSubmitting(true);

    socket.emit('student:join', { pin: cleanPin, name: cleanName }, (res: { success: boolean; message?: string }) => {
      setIsSubmitting(false);
      sessionStorage.setItem('asi_quiz_pin', cleanPin);
      sessionStorage.setItem('asi_quiz_name', cleanName);
      onJoined(cleanPin, cleanName);
    });
  };

  const handleQuickPlay = () => {
    const quickPin = pin.trim() || '123456';
    const quickName = name.trim() || `Player ${Math.floor(100 + Math.random() * 900)}`;
    sessionStorage.setItem('asi_quiz_pin', quickPin);
    sessionStorage.setItem('asi_quiz_name', quickName);
    socket.emit('student:join', { pin: quickPin, name: quickName });
    onJoined(quickPin, quickName);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#0b0f19]">
      <div className="relative">
        <BrandingHeader />
        {/* Host Mode Shortcut Button */}
        <div className="absolute top-4 right-4 z-20">
          <a
            href="/host"
            className="py-2 px-4 rounded-xl text-xs font-black bg-rose-950/80 border border-rose-500/50 hover:bg-rose-900 text-rose-300 shadow-lg flex items-center gap-1.5 transition-all hover:scale-105"
          >
            <span>👑</span> HOST SCREEN
          </a>
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#151c2e] border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 text-rose-400 mb-3 border border-rose-500/30">
              <Sparkles className="w-7 h-7 animate-pulse" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-['Outfit']">Join Live Quiz</h2>
            <p className="text-sm text-slate-400 mt-1">
              {isScanned ? '✓ QR Code Scanned! Enter your name to play.' : 'Enter your name and join the arena'}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-sm flex items-start gap-3 animate-shake">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                YOUR DISPLAY NAME
              </label>
              <input
                type="text"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex, Rahul, Sarah..."
                maxLength={30}
                className="w-full text-center text-lg font-semibold bg-slate-900/90 border-2 border-slate-700 focus:border-rose-500 rounded-2xl py-3.5 px-4 text-white focus:outline-none transition-colors shadow-inner"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  GAME PIN
                </label>
                {isScanned && (
                  <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <QrCode className="w-3 h-3" /> Auto-filled from QR
                  </span>
                )}
              </div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="6-Digit PIN (e.g. 482731)"
                className="w-full text-center text-2xl font-mono tracking-[0.2em] font-black bg-slate-900/80 border border-slate-700 focus:border-rose-500 rounded-2xl py-2.5 px-4 text-white focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-2xl font-extrabold text-lg text-white bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 active:scale-[0.99] shadow-lg shadow-rose-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  ENTER GAME
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleQuickPlay}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-all flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 text-amber-400" /> Instant Quick Play
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-500">
            No registration or login needed. Instant play.
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-600 border-t border-slate-900">
        ASI Student Chapter &bull; Sri Shakthi Institute of Engineering and Technology
      </footer>
    </div>
  );
};
