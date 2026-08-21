import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { HostState } from '../types';
import { socket } from '../socket';
import { BrandingHeader } from './BrandingHeader';
import { PodiumFinaleView } from './PodiumFinaleView';
import { MilestoneLeaderboardView } from './MilestoneLeaderboardView';
import { Users, Play, SkipForward, RotateCcw, AlertTriangle, X, Award, CheckCircle, BarChart3, Clock, Sparkles } from 'lucide-react';

interface HostDashboardProps {
  hostState: HostState;
}

export const HostDashboard: React.FC<HostDashboardProps> = ({ hostState }) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [studentJoinUrl, setStudentJoinUrl] = useState('');


  const { pin, state, currentQuestion, questionResult, leaderboard, participantCount, participants, answerCount, timeLeft, timeLimit } = hostState;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const base = customBaseUrl.trim() || window.location.origin;
      // IMPORTANT: URL must point to /join (not /) so QR takes students to the join page,
      // not the root which may show Vercel deployment protection.
      setStudentJoinUrl(`${base.replace(/\/$/, '')}/join?pin=${pin}`);
    }
  }, [pin, customBaseUrl]);

  const handleCopyLink = () => {
    if (studentJoinUrl) {
      // Copy the full join URL (including the ?pin= param)
      navigator.clipboard.writeText(studentJoinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (state === 'FINISHED' || state === 'LEADERBOARD') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [state]);

  const handleStartQuiz = () => socket.emit('host:startQuiz');
  const handleEndQuestion = () => socket.emit('host:endQuestion');
  const handleShowLeaderboard = () => socket.emit('host:showLeaderboard');
  const handleNextQuestion = () => socket.emit('host:nextQuestion');
  const handleResetQuiz = () => {
    socket.emit('host:resetQuiz');
    setShowResetConfirm(false);
  };
  const handleKickParticipant = (socketIdOrName: string) => {
    socket.emit('host:kickParticipant', { socketIdOrName });
  };

  const getOptionLetter = (idx: number) => ['A', 'B', 'C', 'D'][idx] || '';

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#0b0f19] text-white">
      <BrandingHeader />

      {/* Main Host Area (Optimized for 16:9 Projector / Smart Board) */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 flex flex-col justify-between">

        {/* LOBBY STATE */}
        {state === 'LOBBY' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start my-auto">
            {/* Left: PIN & QR Code */}
            <div className="lg:col-span-5 bg-[#151c2e] border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl flex flex-col items-center">
              <div className="text-xs font-bold uppercase tracking-widest text-rose-400 mb-2">JOIN WITH GAME PIN</div>
              
              {/* Massive Game PIN */}
              <div className="text-5xl sm:text-6xl md:text-7xl font-mono font-black tracking-widest text-amber-400 py-3 bg-slate-900 border-2 border-amber-500/40 rounded-2xl w-full my-2 shadow-inner">
                {pin}
              </div>

              <div className="text-xs text-slate-400 mt-2 mb-1">
                <span className="text-slate-300 font-semibold">Scan the QR code</span> or enter the Game PIN manually.
                <button
                  onClick={() => setIsEditingUrl(!isEditingUrl)}
                  className="ml-2 text-[10px] text-rose-400 hover:underline"
                >
                  {isEditingUrl ? 'Close' : 'Change Domain'}
                </button>
              </div>

              {isEditingUrl && (
                <div className="w-full mb-3 bg-slate-900/90 p-3 rounded-xl border border-slate-700 text-left space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300">
                    Custom Join URL / Domain
                  </label>
                  <input
                    type="text"
                    value={customBaseUrl}
                    onChange={(e) => setCustomBaseUrl(e.target.value)}
                    placeholder="https://quiz-team-neurox.vercel.app"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-rose-500"
                  />
                  <p className="text-[10px] text-slate-400">
                    QR will point to: <span className="text-emerald-400 font-mono">{studentJoinUrl}</span>
                  </p>
                </div>
              )}

              {/* QR Code — minimum 280px for projector/smart board readability */}
              <div className="bg-white p-4 rounded-2xl shadow-xl border-4 border-slate-800 inline-block mb-3">
                <QRCodeSVG value={studentJoinUrl} size={280} level="M" includeMargin />
              </div>

              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Scan with mobile camera to join instantly
                </p>
                <button
                  onClick={handleCopyLink}
                  className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 font-semibold transition-colors"
                >
                  {copied ? '✓ Copied' : 'Copy Link'}
                </button>
              </div>



              {/* Start Quiz Action */}
              <button
                onClick={handleStartQuiz}
                disabled={participantCount === 0}
                className="w-full mt-6 py-4 px-6 rounded-2xl font-extrabold text-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 shadow-xl shadow-rose-900/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-6 h-6 fill-current" />
                START QUIZ ({participantCount} JOINED)
              </button>
            </div>

            {/* Right: Live Participants Grid */}
            <div className="lg:col-span-7 bg-[#151c2e] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col h-[520px]">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">LIVE PARTICIPANTS</h3>
                    <p className="text-xs text-slate-400">Real-time student connections</p>
                  </div>
                </div>
                <span className="text-2xl font-mono font-black text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-4 py-1 rounded-xl">
                  {participantCount}
                </span>
              </div>

              {/* Participant Name List */}
              <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 sm:grid-cols-3 gap-2.5 content-start">
                {participants.length === 0 ? (
                  <div className="col-span-full py-16 text-center text-slate-500">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    Waiting for students to join using Game PIN <span className="font-bold text-slate-300">{pin}</span>...
                  </div>
                ) : (
                  participants.map((p) => (
                    <div
                      key={p.socketId}
                      className="group bg-slate-900/90 border border-slate-800 hover:border-slate-700 px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-colors"
                    >
                      <span className="text-sm font-medium text-slate-200 truncate pr-2">{p.name}</span>
                      <button
                        onClick={() => handleKickParticipant(p.socketId)}
                        title="Remove participant"
                        className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* QUESTION_ACTIVE STATE */}
        {state === 'QUESTION_ACTIVE' && currentQuestion && (
          <div className="space-y-6 my-auto">
            {/* Header info bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-[#151c2e] border border-slate-800 p-4 rounded-2xl">
              <span className="text-sm font-black uppercase tracking-widest text-rose-400">
                QUESTION {currentQuestion.questionIndex} / {currentQuestion.totalQuestions}
              </span>
              
              <div className="flex items-center gap-6">
                {/* Live Answer Submissions counter */}
                <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>Answers: <strong className="text-white font-mono text-base">{answerCount} / {participantCount}</strong></span>
                </div>

                {/* Big Timer */}
                <div className="flex items-center gap-2 bg-slate-900 border-2 border-amber-500/40 px-4 py-1.5 rounded-xl">
                  <Clock className={`w-5 h-5 ${timeLeft <= 5 ? 'text-rose-500 animate-bounce' : 'text-amber-400'}`} />
                  <span className={`font-mono font-black text-2xl ${timeLeft <= 5 ? 'text-rose-500' : 'text-amber-400'}`}>
                    {timeLeft}s
                  </span>
                </div>
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-[#151c2e] border-2 border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-relaxed font-['Outfit']">
                {currentQuestion.question}
              </h2>
            </div>

            {/* Option Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentQuestion.options.map((opt, idx) => (
                <div
                  key={idx}
                  className="bg-[#151c2e] border border-slate-800 rounded-2xl p-6 flex items-start gap-4 shadow-lg"
                >
                  <span className="w-10 h-10 rounded-xl bg-slate-900 text-rose-400 border border-slate-700 font-mono font-black text-lg flex items-center justify-center shrink-0">
                    {getOptionLetter(idx)}
                  </span>
                  <span className="text-xl font-semibold text-slate-200 pt-1 leading-snug">
                    {opt.replace(/^[A-D]\.\s*/, '')}
                  </span>
                </div>
              ))}
            </div>

            {/* Host Action Bar */}
            <div className="flex justify-end">
              <button
                onClick={handleEndQuestion}
                className="py-3 px-6 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 transition-colors flex items-center gap-2"
              >
                End Question Early
              </button>
            </div>
          </div>
        )}

        {/* QUESTION_RESULTS STATE */}
        {state === 'QUESTION_RESULTS' && questionResult && (
          <div className="space-y-6 my-auto">
            <div className="bg-rose-950/40 border border-rose-500/40 p-4 rounded-2xl text-center">
              <h3 className="text-2xl font-black text-rose-400 font-['Outfit']">TIME'S UP! — CORRECT ANSWER REVEALED</h3>
            </div>

            {/* Question Text */}
            <div className="bg-[#151c2e] border border-slate-800 rounded-3xl p-6 sm:p-8">
              <p className="text-2xl font-bold text-white leading-relaxed">{questionResult.questionText}</p>
            </div>

            {/* Options with Stats & Correct Highlight */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {questionResult.options.map((opt, idx) => {
                const isCorrect = idx === questionResult.correctAnswer;
                const statsMap = [
                  questionResult.stats.countA,
                  questionResult.stats.countB,
                  questionResult.stats.countC,
                  questionResult.stats.countD
                ];
                const count = statsMap[idx] || 0;
                const pct = questionResult.stats.totalAnswers > 0 ? Math.round((count / questionResult.stats.totalAnswers) * 100) : 0;

                return (
                  <div
                    key={idx}
                    className={`rounded-2xl p-6 border-2 transition-all relative overflow-hidden ${
                      isCorrect
                        ? 'bg-emerald-950/80 border-emerald-400 glow-cyan scale-[1.02]'
                        : 'bg-[#151c2e] border-slate-800 opacity-70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-lg font-mono font-black flex items-center justify-center text-sm ${
                          isCorrect ? 'bg-emerald-500 text-black' : 'bg-slate-900 text-slate-300'
                        }`}>
                          {getOptionLetter(idx)}
                        </span>
                        <span className={`text-lg font-bold ${isCorrect ? 'text-white' : 'text-slate-300'}`}>
                          {opt.replace(/^[A-D]\.\s*/, '')}
                        </span>
                      </div>
                      {isCorrect && <CheckCircle className="w-7 h-7 text-emerald-400 shrink-0" />}
                    </div>

                    {/* Stat Progress Bar */}
                    <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden flex items-center">
                      <div
                        className={`h-full ${isCorrect ? 'bg-emerald-400' : 'bg-slate-700'}`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center text-xs mt-1.5 text-slate-400 font-mono">
                      <span>{count} answers</span>
                      <span>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Host Action Control */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700 px-4 py-2 rounded-xl text-xs font-semibold text-amber-300">
                <Clock className="w-4 h-4 animate-spin text-amber-400" />
                <span>
                  {(currentQuestion?.questionIndex || 1) % 5 === 0 || (currentQuestion?.questionIndex || 1) >= 13
                    ? `⚡ Leaderboard appearing in ${timeLeft > 0 ? timeLeft : 1}s (Auto)`
                    : `⚡ Next question starting in ${timeLeft > 0 ? timeLeft : 1}s (Auto)`}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleShowLeaderboard}
                  className="py-3 px-6 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  Show Leaderboard Now
                </button>
                <button
                  onClick={handleNextQuestion}
                  className="py-3 px-6 rounded-xl font-extrabold text-sm bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 shadow-lg flex items-center gap-2"
                >
                  <SkipForward className="w-4 h-4" />
                  Next Question →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LEADERBOARD STATE */}
        {state === 'LEADERBOARD' && (
          <MilestoneLeaderboardView
            leaderboard={leaderboard}
            timeLeft={timeLeft}
            onNextQuestion={handleNextQuestion}
          />
        )}

        {/* FINISHED STATE (CHAMPIONSHIP PODIUM & WINNERS) */}
        {state === 'FINISHED' && (
          <PodiumFinaleView
            leaderboard={leaderboard}
            onResetQuiz={() => setShowResetConfirm(true)}
          />
        )}
      </main>

      {/* Global Host Toolbar */}
      <footer className="bg-[#0d1322] border-t border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400">GAME PIN: <strong className="text-amber-400 font-mono text-sm">{pin}</strong></span>
          <span className="text-slate-600">&bull;</span>
          <span className="text-xs text-slate-400">Status: <strong className="text-rose-400 uppercase">{state}</strong></span>
        </div>

        <button
          onClick={() => setShowResetConfirm(true)}
          className="py-2 px-4 rounded-xl text-xs font-bold text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800 hover:border-rose-500/40 transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-3.5 h-3.5" /> RESET QUIZ
        </button>
      </footer>

      {/* RESET CONFIRMATION MODAL */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151c2e] border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl space-y-5 animate-scale-in">
            <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-2xl font-bold text-white font-['Outfit']">RESET QUIZ?</h3>
            <p className="text-sm text-slate-300">
              This will clear all current participants, reset all scores, and return to the lobby with a new Game PIN.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-3 px-4 rounded-xl text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                CANCEL
              </button>
              <button
                onClick={handleResetQuiz}
                className="flex-1 py-3 px-4 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/40"
              >
                CONFIRM RESET
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
