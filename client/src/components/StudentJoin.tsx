import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import { BrandingHeader } from './BrandingHeader';
import { LogIn, Sparkles, AlertCircle, QrCode, Users, Loader2 } from 'lucide-react';

interface StudentJoinProps {
  onJoined: (pin: string, name: string) => void;
}

type JoinStatus =
  | 'idle'
  | 'checking'     // Validating PIN against server
  | 'ready'        // Game found, show name entry
  | 'joining'      // Submitting join request
  | 'error';       // Error state with message

export const StudentJoin: React.FC<StudentJoinProps> = ({ onJoined }) => {
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [scannedPin, setScannedPin] = useState<string | null>(null); // PIN from QR URL
  const [status, setStatus] = useState<JoinStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState<number | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Read ?pin= from URL (set by QR code)
    const urlParams = new URLSearchParams(window.location.search);
    const pinParam = urlParams.get('pin');
    if (pinParam && /^\d{6}$/.test(pinParam.trim())) {
      const qrPin = pinParam.trim();
      setScannedPin(qrPin);
      setPin(qrPin);
      // Validate the QR PIN immediately on load
      validatePin(qrPin);
    }
  }, []);

  // When status reaches 'ready', focus the name field
  useEffect(() => {
    if (status === 'ready') {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [status]);

  const validatePin = (pinToCheck: string) => {
    setStatus('checking');
    setErrorMsg(null);

    // Emit a check to the game engine / server
    socket.emit('student:checkPin', { pin: pinToCheck }, (res: {
      exists: boolean;
      gameState?: string;
      participantCount?: number;
      message?: string;
    }) => {
      if (!res || !res.exists) {
        setStatus('error');
        setErrorMsg('GAME NOT FOUND\nThe Game PIN is invalid or this game has ended.\nPlease check the PIN on the projector screen.');
        return;
      }

      const gs = res.gameState || 'LOBBY';
      if (gs === 'FINISHED') {
        setStatus('error');
        setErrorMsg('QUIZ ENDED\nThis quiz has already finished.\nThank you for your interest!');
        return;
      }
      if (gs !== 'LOBBY') {
        setStatus('error');
        setErrorMsg('QUIZ ALREADY STARTED\nThis quiz is no longer accepting new participants.\nPlease contact the event coordinator.');
        return;
      }

      setParticipantCount(res.participantCount ?? null);
      setStatus('ready');
    });
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      setErrorMsg('Please enter a valid 6-digit Game PIN.');
      setStatus('error');
      return;
    }
    validatePin(cleanPin);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanPin = pin.trim();
    const cleanName = name.trim();

    if (!cleanName) {
      setErrorMsg('Please enter your display name.');
      return;
    }
    if (cleanName.length > 30) {
      setErrorMsg('Name must be 30 characters or less.');
      return;
    }

    setStatus('joining');

    socket.emit('student:join', { pin: cleanPin, name: cleanName }, (res: {
      success: boolean;
      message?: string;
      pin?: string;
    }) => {
      if (!res || !res.success) {
        const msg = res?.message || 'Failed to join. Please try again.';

        if (msg.toLowerCase().includes('name') && msg.toLowerCase().includes('taken')) {
          setErrorMsg('NAME ALREADY TAKEN\nPlease choose a different name.');
        } else if (msg.toLowerCase().includes('started') || msg.toLowerCase().includes('active')) {
          setErrorMsg('QUIZ ALREADY STARTED\nThis quiz is no longer accepting new participants.');
        } else if (msg.toLowerCase().includes('pin') || msg.toLowerCase().includes('invalid')) {
          setErrorMsg('INVALID GAME PIN\nPlease check the PIN on the projector screen.');
          setStatus('idle');
          return;
        } else {
          setErrorMsg(msg);
        }
        setStatus('ready');
        return;
      }

      // Successfully joined
      sessionStorage.setItem('asi_quiz_pin', cleanPin);
      sessionStorage.setItem('asi_quiz_name', cleanName);
      onJoined(cleanPin, cleanName);
    });
  };

  const isQrFlow = !!scannedPin;

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19]">
      <div className="relative">
        <BrandingHeader />
        {/* Host shortcut — top right, subtle */}
        <div className="absolute top-4 right-4 z-20">
          <a
            href="/host"
            className="py-2 px-3 rounded-xl text-[11px] font-bold bg-rose-950/70 border border-rose-500/40 hover:bg-rose-900/80 text-rose-400 shadow-lg flex items-center gap-1 transition-all"
          >
            <span>👑</span> HOST
          </a>
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-md">

          {/* ─── QR SCANNED BADGE ─── */}
          {isQrFlow && (
            <div className="flex items-center justify-center gap-2 mb-4 py-2 px-4 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-sm font-semibold w-fit mx-auto">
              <QrCode className="w-4 h-4" />
              QR Code scanned — PIN ready
            </div>
          )}

          <div className="bg-[#151c2e] border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8">

            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 text-rose-400 mb-3 border border-rose-500/30">
                <Sparkles className="w-7 h-7 animate-pulse" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white font-['Outfit']">
                JOIN GAME
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                ASI Quiz Arena — No login required
              </p>
            </div>

            {/* ─── ERROR DISPLAY ─── */}
            {errorMsg && (
              <div className="mb-5 p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="font-medium whitespace-pre-line leading-relaxed">{errorMsg}</div>
              </div>
            )}

            {/* ─── STEP 1: PIN ENTRY (only when no QR and not yet validated) ─── */}
            {!isQrFlow && (status === 'idle' || status === 'error') && (
              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    GAME PIN
                  </label>
                  <input
                    id="game-pin-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoFocus
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value.replace(/[^0-9]/g, ''));
                      setErrorMsg(null);
                      setStatus('idle');
                    }}
                    placeholder="Enter 6-digit PIN"
                    className="w-full text-center text-3xl font-mono tracking-[0.3em] font-black bg-slate-900/90 border-2 border-slate-700 focus:border-rose-500 rounded-2xl py-4 px-4 text-white focus:outline-none transition-colors shadow-inner"
                  />
                </div>
                <button
                  type="submit"
                  disabled={pin.length !== 6}
                  className="w-full py-4 px-6 rounded-2xl font-extrabold text-lg text-white bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 shadow-lg shadow-rose-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
                >
                  <LogIn className="w-5 h-5" />
                  CONTINUE
                </button>
              </form>
            )}

            {/* ─── CHECKING STATE ─── */}
            {status === 'checking' && (
              <div className="flex flex-col items-center justify-center py-10 gap-4 text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin text-rose-400" />
                <p className="font-semibold">Checking game PIN…</p>
              </div>
            )}

            {/* ─── STEP 2: NAME ENTRY (PIN validated, game is in LOBBY) ─── */}
            {(status === 'ready' || status === 'joining') && (
              <form onSubmit={handleJoin} className="space-y-5">

                {/* Game PIN display (read-only, prominent) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                    GAME PIN
                    {isQrFlow && (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1 normal-case text-[10px]">
                        <QrCode className="w-3 h-3" /> Auto-filled from QR
                      </span>
                    )}
                  </label>
                  <div className="w-full text-center text-3xl font-mono tracking-[0.3em] font-black bg-slate-900/60 border border-slate-700 rounded-2xl py-3 px-4 text-amber-400 select-none">
                    {pin}
                  </div>
                </div>

                {/* Participant count hint */}
                {participantCount !== null && (
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-semibold">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span><strong className="text-emerald-400">{participantCount}</strong> student{participantCount !== 1 ? 's' : ''} already in the game</span>
                  </div>
                )}

                {/* Name input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    YOUR NAME
                  </label>
                  <input
                    id="student-name-input"
                    ref={nameInputRef}
                    type="text"
                    autoFocus
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="Enter your name…"
                    maxLength={30}
                    className="w-full text-center text-xl font-semibold bg-slate-900/90 border-2 border-slate-700 focus:border-rose-500 rounded-2xl py-4 px-4 text-white focus:outline-none transition-colors shadow-inner"
                    required
                  />
                </div>

                {/* Join button */}
                <button
                  type="submit"
                  disabled={status === 'joining' || !name.trim()}
                  id="join-quiz-btn"
                  className="w-full py-4 px-6 rounded-2xl font-extrabold text-xl text-white bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 active:scale-[0.99] shadow-xl shadow-rose-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'joining' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      JOINING…
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      JOIN QUIZ
                    </>
                  )}
                </button>

                {/* Allow going back to change PIN (non-QR flow only) */}
                {!isQrFlow && (
                  <button
                    type="button"
                    onClick={() => {
                      setStatus('idle');
                      setErrorMsg(null);
                      setName('');
                    }}
                    className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    ← Change Game PIN
                  </button>
                )}
              </form>
            )}

          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-slate-600 mt-5">
            No account or login needed · ASI Student Chapter · Sri Shakthi Institute
          </p>
        </div>
      </main>
    </div>
  );
};
