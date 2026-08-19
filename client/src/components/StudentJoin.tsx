import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { BrandingHeader } from './BrandingHeader';
import { LogIn, Sparkles, AlertCircle } from 'lucide-react';

interface StudentJoinProps {
  onJoined: (pin: string, name: string) => void;
}

export const StudentJoin: React.FC<StudentJoinProps> = ({ onJoined }) => {
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check URL parameters for ?pin=XXXXXX
    const urlParams = new URLSearchParams(window.location.search);
    const pinParam = urlParams.get('pin');
    if (pinParam) {
      setPin(pinParam);
    }
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPin = pin.trim();
    const cleanName = name.trim();

    if (!cleanPin) {
      setError('Please enter the 6-digit Game PIN displayed on the screen.');
      return;
    }

    if (cleanPin.length !== 6) {
      setError('Game PIN must be exactly 6 digits.');
      return;
    }

    if (!cleanName) {
      setError('Please enter your name.');
      return;
    }

    if (cleanName.length > 30) {
      setError('Name must be 30 characters or less.');
      return;
    }

    setIsSubmitting(true);

    socket.emit('student:join', { pin: cleanPin, name: cleanName });

    const handleJoinResponse = (res: { success: boolean; message?: string; pin?: string }) => {
      socket.off('student:joinResponse', handleJoinResponse);
      setIsSubmitting(false);

      if (res.success) {
        sessionStorage.setItem('asi_quiz_pin', cleanPin);
        sessionStorage.setItem('asi_quiz_name', cleanName);
        onJoined(cleanPin, cleanName);
      } else {
        setError(res.message || 'Failed to join quiz room.');
      }
    };

    socket.on('student:joinResponse', handleJoinResponse);
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
            <span>👑</span> HOST QUIZ
          </a>
        </div>
      </div>


      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#151c2e] border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md">
          
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 mb-3 border border-rose-500/20">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-white font-['Outfit']">Join Live Quiz</h2>
            <p className="text-sm text-slate-400 mt-1">Enter your Game PIN and Display Name to participate</p>
          </div>

          {error && (
            <div className="mb-5 p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-sm flex items-start gap-3 animate-shake">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                ENTER GAME PIN
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="6-Digit PIN (e.g. 482731)"
                className="w-full text-center text-3xl font-mono tracking-[0.25em] font-black bg-slate-900/90 border-2 border-slate-700 focus:border-rose-500 rounded-xl py-3 px-4 text-white focus:outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                ENTER YOUR NAME
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Full Name"
                maxLength={30}
                className="w-full text-center text-lg font-semibold bg-slate-900/90 border-2 border-slate-700 focus:border-rose-500 rounded-xl py-3.5 px-4 text-white focus:outline-none transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-xl font-extrabold text-lg text-white bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 active:scale-[0.99] shadow-lg shadow-rose-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  JOIN QUIZ
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            No password or registration required. Fast student entry.
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-600 border-t border-slate-900">
        ASI Student Chapter &bull; Sri Shakthi Institute of Engineering and Technology
      </footer>
    </div>
  );
};
