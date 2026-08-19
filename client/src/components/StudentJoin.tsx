import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import { BrandingHeader } from './BrandingHeader';
import { LogIn, Sparkles, AlertCircle, QrCode, Users, Loader2, Wifi } from 'lucide-react';

interface StudentJoinProps {
  onJoined: (pin: string, name: string) => void;
}

type Step = 'pin_entry' | 'checking_pin' | 'name_entry' | 'joining' | 'error_pin';

export const StudentJoin: React.FC<StudentJoinProps> = ({ onJoined }) => {
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState<Step>('pin_entry');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState<number | null>(null);
  const [isQrScanned, setIsQrScanned] = useState(false);
  const [isConnected, setIsConnected] = useState(socket.connected);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const currentNameRef = useRef('');
  const currentPinRef = useRef('');

  // Keep refs in sync for the socket listener closure
  useEffect(() => {
    currentNameRef.current = name;
    currentPinRef.current = pin;
  }, [name, pin]);

  // ── Socket connection status ──────────────────────────────────────
  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  // ── Listen for student:joinResponse from server ───────────────────
  useEffect(() => {
    const onJoinResponse = (res: {
      success: boolean;
      message?: string;
      pin?: string;
      participant?: { name: string };
    }) => {
      if (res.success) {
        const resolvedPin = res.pin || currentPinRef.current;
        const resolvedName = currentNameRef.current;
        sessionStorage.setItem('asi_quiz_pin', resolvedPin);
        sessionStorage.setItem('asi_quiz_name', resolvedName);
        onJoined(resolvedPin, resolvedName);
      } else {
        const msg = res.message || 'Failed to join. Please try again.';
        if (msg.toLowerCase().includes('name') || msg.toLowerCase().includes('taken')) {
          setErrorMsg('NAME ALREADY TAKEN — Please choose a different display name.');
        } else if (msg.toLowerCase().includes('started') || msg.toLowerCase().includes('active')) {
          setErrorMsg('QUIZ ALREADY STARTED — This quiz is no longer accepting new participants.');
        } else if (msg.toLowerCase().includes('pin') || msg.toLowerCase().includes('invalid')) {
          setErrorMsg('INVALID GAME PIN — Please ask the host for the current PIN.');
          setStep('error_pin');
          return;
        } else {
          setErrorMsg(msg);
        }
        setStep('name_entry');
      }
    };

    socket.on('student:joinResponse', onJoinResponse);
    return () => { socket.off('student:joinResponse', onJoinResponse); };
  }, [onJoined]);

  // ── Read ?pin= from URL on mount (QR code flow) ──────────────────
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pinParam = urlParams.get('pin');
    if (pinParam && /^\d{6}$/.test(pinParam.trim())) {
      const qrPin = pinParam.trim();
      setPin(qrPin);
      setIsQrScanned(true);
      validatePin(qrPin);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-focus name input when ready
  useEffect(() => {
    if (step === 'name_entry') {
      setTimeout(() => nameInputRef.current?.focus(), 80);
    }
  }, [step]);

  // ── PIN validation (checks with server) ──────────────────────────
  const validatePin = (pinToCheck: string) => {
    setStep('checking_pin');
    setErrorMsg(null);

    socket.emit(
      'student:checkPin',
      { pin: pinToCheck },
      (res: { exists: boolean; gameState?: string; participantCount?: number; message?: string }) => {
        if (!res || !res.exists) {
          setStep('error_pin');
          setErrorMsg(
            'GAME NOT FOUND\nThe Game PIN is invalid or this game has ended.\nPlease check the PIN shown on the projector screen.'
          );
          return;
        }
        const gs = res.gameState ?? 'LOBBY';
        if (gs === 'FINISHED') {
          setStep('error_pin');
          setErrorMsg('QUIZ HAS ENDED\nThis quiz session is over. Thank you for participating!');
          return;
        }
        if (gs !== 'LOBBY') {
          setStep('error_pin');
          setErrorMsg(
            'QUIZ ALREADY STARTED\nThis quiz is no longer accepting new participants.\nPlease contact the event coordinator.'
          );
          return;
        }
        setParticipantCount(res.participantCount ?? null);
        setStep('name_entry');
      }
    );
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      setErrorMsg('Please enter a valid 6-digit Game PIN.');
      return;
    }
    validatePin(cleanPin);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg('Please enter your display name.');
      return;
    }
    if (cleanName.length > 30) {
      setErrorMsg('Name must be 30 characters or less.');
      return;
    }
    setStep('joining');
    socket.emit('student:join', { pin: pin.trim(), name: cleanName });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19]">
      <div className="relative">
        <BrandingHeader />
        <div className="absolute top-4 right-4 z-20">
          <a
            href="/host"
            className="py-2 px-3 rounded-xl text-[11px] font-bold bg-rose-950/70 border border-rose-500/40 hover:bg-rose-900/80 text-rose-400 flex items-center gap-1 transition-all"
          >
            <span>👑</span> HOST
          </a>
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-md space-y-4">

          {/* ─── Server connection warning ─── */}
          {!isConnected && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-amber-300 text-sm font-semibold">
              <Wifi className="w-4 h-4 shrink-0 animate-pulse" />
              Connecting to server… please wait
            </div>
          )}

          {/* ─── QR scanned badge ─── */}
          {isQrScanned && (
            <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-sm font-semibold w-fit mx-auto">
              <QrCode className="w-4 h-4" />
              QR scanned — Game PIN detected
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
              <p className="text-sm text-slate-400 mt-1">No login required · ASI Quiz Arena</p>
            </div>

            {/* ─── Error display ─── */}
            {errorMsg && (
              <div className="mb-5 p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="font-medium whitespace-pre-line leading-relaxed">{errorMsg}</div>
              </div>
            )}

            {/* ─── STEP: PIN Entry (manual, no QR) ─── */}
            {(step === 'pin_entry' || step === 'error_pin') && (
              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="game-pin-input"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2"
                  >
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
                      if (step === 'error_pin') setStep('pin_entry');
                    }}
                    placeholder="Enter 6-digit PIN"
                    className="w-full text-center text-3xl font-mono tracking-[0.3em] font-black bg-slate-900/90 border-2 border-slate-700 focus:border-rose-500 rounded-2xl py-4 px-4 text-white focus:outline-none transition-colors"
                  />
                </div>
                <button
                  id="pin-continue-btn"
                  type="submit"
                  disabled={pin.length !== 6 || !isConnected}
                  className="w-full py-4 px-6 rounded-2xl font-extrabold text-lg text-white bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 shadow-lg shadow-rose-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
                >
                  CONTINUE →
                </button>
              </form>
            )}

            {/* ─── STEP: Checking PIN ─── */}
            {step === 'checking_pin' && (
              <div className="flex flex-col items-center justify-center py-10 gap-4 text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin text-rose-400" />
                <p className="font-semibold">Checking game PIN…</p>
              </div>
            )}

            {/* ─── STEP: Name Entry ─── */}
            {(step === 'name_entry' || step === 'joining') && (
              <form onSubmit={handleJoin} className="space-y-5">

                {/* Game PIN (read-only display) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      GAME PIN
                    </label>
                    {isQrScanned && (
                      <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                        <QrCode className="w-3 h-3" /> From QR
                      </span>
                    )}
                  </div>
                  <div className="w-full text-center text-3xl font-mono tracking-[0.3em] font-black bg-slate-900/60 border border-slate-700 rounded-2xl py-3 px-4 text-amber-400 select-none">
                    {pin}
                  </div>
                </div>

                {/* Participant count hint */}
                {participantCount !== null && (
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-semibold -mt-1">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      <strong className="text-emerald-400">{participantCount}</strong>{' '}
                      student{participantCount !== 1 ? 's' : ''} already in the game
                    </span>
                  </div>
                )}

                {/* Name input */}
                <div>
                  <label
                    htmlFor="student-name-input"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2"
                  >
                    YOUR NAME
                  </label>
                  <input
                    id="student-name-input"
                    ref={nameInputRef}
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="Enter your name…"
                    maxLength={30}
                    className="w-full text-center text-xl font-semibold bg-slate-900/90 border-2 border-slate-700 focus:border-rose-500 rounded-2xl py-4 px-4 text-white focus:outline-none transition-colors"
                    required
                    autoComplete="off"
                  />
                </div>

                {/* Join button */}
                <button
                  id="join-quiz-btn"
                  type="submit"
                  disabled={step === 'joining' || !name.trim() || !isConnected}
                  className="w-full py-4 px-6 rounded-2xl font-extrabold text-xl text-white bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 active:scale-[0.99] shadow-xl shadow-rose-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {step === 'joining' ? (
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

                {/* Go back to PIN (non-QR flow only) */}
                {!isQrScanned && (
                  <button
                    type="button"
                    onClick={() => {
                      setStep('pin_entry');
                      setErrorMsg(null);
                      setName('');
                    }}
                    className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    ← Change Game PIN
                  </button>
                )}
              </form>
            )}
          </div>

          <p className="text-center text-xs text-slate-600 pb-2">
            No account or login needed · ASI Student Chapter · Sri Shakthi Institute of Engineering and Technology
          </p>
        </div>
      </main>
    </div>
  );
};
