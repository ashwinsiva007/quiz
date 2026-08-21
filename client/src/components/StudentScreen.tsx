import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { StudentQuizState } from '../types';
import { socket } from '../socket';
import { BrandingHeader } from './BrandingHeader';
import { CheckCircle2, XCircle, Clock, Trophy, Award, Sparkles, Crown, Medal, Flame, Star } from 'lucide-react';

interface StudentScreenProps {
  quizState: StudentQuizState;
  studentName: string;
  onLeave: () => void;
}

export const StudentScreen: React.FC<StudentScreenProps> = ({ quizState, studentName, onLeave }) => {
  const { state, currentQuestion, timeLeft, timeLimit, participant, studentResult, leaderboard } = quizState;

  // Local optimistic answer lock so the student gets INSTANT feedback with zero latency
  const [selectedOptionLocal, setSelectedOptionLocal] = useState<number | null>(null);
  const [answeredQuestionIdx, setAnsweredQuestionIdx] = useState<number | null>(null);

  const currentQIndex = currentQuestion?.questionIndex ?? -1;

  // Reset local answer selection whenever a new question is activated
  useEffect(() => {
    if (answeredQuestionIdx !== null && answeredQuestionIdx !== currentQIndex) {
      setSelectedOptionLocal(null);
      setAnsweredQuestionIdx(null);
    }
  }, [currentQIndex, answeredQuestionIdx]);

  // Periodic heartbeat sync so every device stays synchronized without delay
  useEffect(() => {
    const interval = setInterval(() => {
      socket.emit('getInitialState');
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const hasAnsweredCurrent = (selectedOptionLocal !== null && answeredQuestionIdx === currentQIndex) || !!participant?.hasAnswered;
  const activeChosenOption = (selectedOptionLocal !== null && answeredQuestionIdx === currentQIndex) 
    ? selectedOptionLocal 
    : (participant?.selectedOption ?? null);

  const handleSelectOption = (optionIndex: number) => {
    if (state !== 'QUESTION_ACTIVE' || hasAnsweredCurrent) return;

    // 1. Immediately lock answer locally to prevent duplicate selections & give instant UI response
    setSelectedOptionLocal(optionIndex);
    setAnsweredQuestionIdx(currentQIndex);

    // 2. Transmit to server & game engine
    socket.emit('student:submitAnswer', {
      optionIndex,
      name: studentName,
      pin: quizState.pin,
      questionIndex: currentQIndex
    });
  };

  const getOptionLetter = (idx: number) => ['A', 'B', 'C', 'D'][idx] || '';

  const getOptionStyle = (idx: number) => {
    const colors = [
      'from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 border-rose-500/50',
      'from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 border-cyan-500/50',
      'from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 border-amber-500/50',
      'from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 border-emerald-500/50'
    ];
    return colors[idx % 4];
  };

  // Find current student rank
  const myRankEntry = leaderboard.find(l => l.name.toLowerCase() === studentName.toLowerCase());

  // Celebration trigger on final results screen
  useEffect(() => {
    if (state === 'FINISHED') {
      confetti({
        particleCount: myRankEntry && myRankEntry.rank <= 3 ? 90 : 50,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [state, myRankEntry]);

  // Derive result data
  const isCorrect = studentResult?.isCorrect ?? false;
  const correctOptionIdx = studentResult?.correctOption ?? 0;
  const currentTotalScore = studentResult?.score ?? participant?.score ?? 0;
  const roundScore = studentResult?.lastQuestionScore ?? 0;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#0b0f19] select-none">
      <BrandingHeader compact />

      {/* Top Status Bar */}
      <div className="bg-[#151c2e] border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="font-semibold text-slate-200">{studentName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-md text-amber-400 font-bold">
            {participant?.score ?? currentTotalScore} PTS
          </span>
          <button
            onClick={onLeave}
            className="text-xs text-rose-400 hover:underline font-medium"
          >
            Leave
          </button>
        </div>
      </div>

      {/* Main Student Quiz Area */}
      <main className="flex-1 max-w-xl mx-auto w-full p-4 flex flex-col justify-center">

        {/* STATE: LOBBY (WAITING) */}
        {state === 'LOBBY' && (
          <div className="bg-[#151c2e] border border-slate-800 rounded-3xl p-8 text-center shadow-2xl space-y-6">
            <div className="relative inline-block">
              <div className="w-20 h-20 bg-rose-500/10 border-2 border-rose-500/30 rounded-full flex items-center justify-center mx-auto text-rose-500">
                <Sparkles className="w-10 h-10 animate-spin" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white font-['Outfit']">YOU'RE IN THE ARENA!</h3>
              <p className="text-slate-400 text-sm">
                Waiting for the host to start the quiz. Keep this screen open.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-500 block mb-1">PARTICIPATING AS</span>
              <span className="text-xl font-bold text-amber-400">{studentName}</span>
            </div>
          </div>
        )}

        {/* STATE: QUESTION ACTIVE */}
        {state === 'QUESTION_ACTIVE' && currentQuestion && (
          <div className="space-y-4">
            {/* Header info */}
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 bg-[#151c2e] border border-slate-800 px-4 py-2 rounded-xl">
              <span className="text-rose-400">
                Q{currentQuestion.questionIndex} OF {currentQuestion.totalQuestions}
              </span>
              <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
                <Clock className={`w-3.5 h-3.5 ${timeLeft <= 5 ? 'text-rose-500 animate-bounce' : 'text-amber-400'}`} />
                <span className={`font-mono font-bold ${timeLeft <= 5 ? 'text-rose-500' : 'text-amber-400'}`}>
                  {timeLeft}s
                </span>
              </div>
            </div>

            {/* Question Text */}
            <div className="bg-[#151c2e] border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h3 className="text-lg font-bold text-white leading-snug">
                {currentQuestion.question}
              </h3>
            </div>

            {/* If Student Already Answered */}
            {hasAnsweredCurrent ? (
              <div className="bg-gradient-to-b from-emerald-950/60 to-[#151c2e] border-2 border-emerald-500/60 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-4 animate-scale-in">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-900/30">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-2xl font-black text-white font-['Outfit'] tracking-wide">ANSWER SUBMITTED!</h4>
                  <p className="text-xs text-emerald-400 font-semibold">Your selection is locked in</p>
                </div>

                {activeChosenOption !== null && currentQuestion.options[activeChosenOption] && (
                  <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 text-left">
                    <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Your Selected Option:</span>
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-emerald-500 text-black font-mono font-black text-sm flex items-center justify-center shrink-0">
                        {getOptionLetter(activeChosenOption)}
                      </span>
                      <span className="text-sm font-bold text-white">
                        {currentQuestion.options[activeChosenOption].replace(/^[A-D]\.\s*/, '')}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span>Waiting for timer to expire & results ({timeLeft}s)…</span>
                </div>
              </div>
            ) : (
              /* 4 Option Action Buttons (Large Touch Targets for Mobile) */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {currentQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    className={`bg-gradient-to-r ${getOptionStyle(idx)} border text-white p-5 rounded-2xl font-bold text-left shadow-lg active:scale-95 hover:scale-[1.01] transition-all flex items-center gap-3 cursor-pointer`}
                  >
                    <span className="w-9 h-9 rounded-xl bg-black/30 border border-white/20 font-mono font-black text-lg flex items-center justify-center shrink-0">
                      {getOptionLetter(idx)}
                    </span>
                    <span className="text-base font-semibold leading-tight">
                      {opt.replace(/^[A-D]\.\s*/, '')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STATE: QUESTION RESULTS */}
        {state === 'QUESTION_RESULTS' && (
          <div className="space-y-4 animate-scale-in">
            {/* Header info */}
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 bg-[#151c2e] border border-slate-800 px-4 py-2 rounded-xl">
              <span className="text-rose-400">
                {currentQuestion ? `QUESTION ${currentQuestion.questionIndex} RESULTS` : 'ROUND RESULTS'}
              </span>
              <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
                <Clock className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                <span className="font-mono font-bold text-emerald-400">
                  {timeLeft > 0 ? timeLeft : 1}s
                </span>
              </div>
            </div>

            {/* Correct/Incorrect Hero Card */}
            {isCorrect ? (
              <div className="bg-gradient-to-b from-emerald-950/90 to-[#151c2e] border-2 border-emerald-500 rounded-3xl p-6 text-center shadow-2xl space-y-3">
                <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
                <div>
                  <h3 className="text-2xl font-black text-emerald-400 font-['Outfit']">CORRECT!</h3>
                  <p className="text-sm font-bold text-amber-400 font-mono mt-1">
                    +{roundScore > 0 ? roundScore : 100} PTS EARNED
                  </p>
                </div>
                <div className="text-xs text-slate-300 pt-2 border-t border-slate-800">
                  Total Score: <strong className="text-white font-mono">{currentTotalScore} PTS</strong>
                </div>
              </div>
            ) : activeChosenOption !== null && activeChosenOption !== undefined ? (
              <div className="bg-gradient-to-b from-rose-950/90 to-[#151c2e] border-2 border-rose-500 rounded-3xl p-6 text-center shadow-2xl space-y-3">
                <XCircle className="w-14 h-14 text-rose-500 mx-auto" />
                <div>
                  <h3 className="text-2xl font-black text-rose-400 font-['Outfit']">INCORRECT</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Correct Answer was Option <strong className="text-emerald-400">{getOptionLetter(correctOptionIdx)}</strong>
                  </p>
                </div>
                <div className="text-xs text-slate-300 pt-2 border-t border-slate-800">
                  Total Score: <strong className="text-white font-mono">{currentTotalScore} PTS</strong>
                </div>
              </div>
            ) : (
              <div className="bg-[#151c2e] border border-slate-800 rounded-3xl p-6 text-center shadow-2xl space-y-2">
                <Clock className="w-12 h-12 text-slate-500 mx-auto" />
                <h3 className="text-xl font-bold text-slate-300">Time Expired</h3>
                <p className="text-xs text-slate-400">
                  You did not submit an answer in time.
                </p>
                <p className="text-sm text-emerald-300 pt-1">
                  Correct Answer was:{' '}
                  <span className="font-bold text-white">
                    {getOptionLetter(correctOptionIdx)}. {currentQuestion?.options[correctOptionIdx]?.replace(/^[A-D]\.\s*/, '')}
                  </span>
                </p>
              </div>
            )}

            {/* Revealed Question & Answers Preview */}
            {currentQuestion && (
              <div className="bg-[#151c2e] border border-slate-800 rounded-2xl p-4 space-y-2.5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Correct Answer Reference:</p>
                <div className="grid grid-cols-1 gap-2">
                  {currentQuestion.options.map((opt, idx) => {
                    const isThisCorrect = idx === correctOptionIdx;
                    const isMyWrongChoice = !isCorrect && activeChosenOption === idx;
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between ${
                          isThisCorrect
                            ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
                            : isMyWrongChoice
                            ? 'bg-rose-950/70 border-rose-500 text-rose-200'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-md font-mono font-bold text-xs flex items-center justify-center ${
                            isThisCorrect ? 'bg-emerald-500 text-black' : isMyWrongChoice ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {getOptionLetter(idx)}
                          </span>
                          <span>{opt.replace(/^[A-D]\.\s*/, '')}</span>
                        </div>
                        {isThisCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                        {isMyWrongChoice && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STATE: LEADERBOARD */}
        {state === 'LEADERBOARD' && (
          <div className="bg-[#151c2e] border border-slate-800 rounded-3xl p-6 text-center shadow-2xl space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <Trophy className="w-7 h-7" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white font-['Outfit']">LIVE RANKING</h3>
              <p className="text-xs text-slate-400">Intermission Standings</p>
            </div>
            
            {myRankEntry && (
              <div className={`p-4 rounded-2xl border-2 flex items-center justify-between shadow-lg ${
                myRankEntry.rank === 1
                  ? 'bg-amber-950/40 border-amber-400/80 glow-gold'
                  : myRankEntry.rank === 2
                  ? 'bg-slate-900 border-slate-300'
                  : myRankEntry.rank === 3
                  ? 'bg-amber-950/30 border-amber-600'
                  : 'bg-slate-900/90 border-slate-700'
              }`}>
                <div className="flex items-center gap-3">
                  <span className={`w-10 h-10 rounded-xl font-mono font-black flex items-center justify-center text-lg ${
                    myRankEntry.rank === 1 ? 'bg-amber-500 text-black' :
                    myRankEntry.rank === 2 ? 'bg-slate-300 text-black' :
                    myRankEntry.rank === 3 ? 'bg-amber-700 text-white' :
                    'bg-slate-800 text-amber-400'
                  }`}>
                    {myRankEntry.rank === 1 ? '🥇' : myRankEntry.rank === 2 ? '🥈' : myRankEntry.rank === 3 ? '🥉' : `#${myRankEntry.rank}`}
                  </span>
                  <div className="text-left">
                    <span className="font-bold text-white text-base block">{myRankEntry.name}</span>
                    {myRankEntry.lastQuestionScore > 0 && (
                      <span className="text-[11px] font-semibold text-emerald-400">+{myRankEntry.lastQuestionScore} pts this round</span>
                    )}
                  </div>
                </div>
                <span className="font-mono font-black text-amber-400 text-lg">
                  {myRankEntry.score} PTS
                </span>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-center pt-2 text-sm text-slate-300 font-semibold bg-slate-900/60 py-2.5 px-4 rounded-2xl border border-slate-800 w-fit mx-auto shadow-md">
              <Clock className="w-4 h-4 text-emerald-400 animate-spin" />
              <span>
                Next question in{' '}
                <strong className="text-emerald-400 font-mono text-base">{timeLeft > 0 ? timeLeft : 1}s</strong>…
              </span>
            </div>
          </div>
        )}

        {/* STATE: FINISHED (GRAND CELEBRATION RESULT SCREEN) */}
        {state === 'FINISHED' && (
          <div className="space-y-4">
            {myRankEntry && myRankEntry.rank === 1 ? (
              /* 1st Place Champion Card */
              <div className="bg-gradient-to-b from-[#2a1c06] via-[#1a1408] to-[#0f172a] border-4 border-amber-400 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-4 glow-champion relative podium-shimmer">
                <Crown className="w-14 h-14 text-amber-300 mx-auto animate-crown-pulse" />
                <div className="space-y-1">
                  <div className="bg-amber-400 text-slate-950 font-black px-4 py-1 rounded-full text-xs uppercase tracking-widest inline-block shadow">
                    👑 GRAND CHAMPION
                  </div>
                  <h3 className="text-3xl font-black text-white font-['Outfit']">YOU WON 1ST PLACE!</h3>
                  <p className="text-amber-300 text-xs font-semibold">Ultimate Champion of ASI Quiz Arena</p>
                </div>

                <div className="bg-slate-900/90 p-5 rounded-2xl border border-amber-500/40 space-y-1">
                  <p className="text-xs uppercase tracking-wider text-slate-400">Total Champion Score</p>
                  <p className="text-4xl sm:text-5xl font-mono font-black text-amber-400 drop-shadow">
                    {participant?.score || 0} PTS
                  </p>
                </div>
              </div>
            ) : myRankEntry && myRankEntry.rank === 2 ? (
              /* 2nd Place Runner-Up Card */
              <div className="bg-gradient-to-b from-[#1e293b] to-[#0f172a] border-2 border-slate-300 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-4 glow-silver">
                <span className="text-5xl block animate-bounce-short">🥈</span>
                <div className="space-y-1">
                  <div className="bg-slate-200 text-slate-950 font-black px-4 py-1 rounded-full text-xs uppercase tracking-widest inline-block shadow">
                    PODIUM FINISHER
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white font-['Outfit']">2ND PLACE FINISH!</h3>
                  <p className="text-slate-300 text-xs font-semibold">Outstanding performance in the arena</p>
                </div>

                <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-700 space-y-1">
                  <p className="text-xs uppercase tracking-wider text-slate-400">Final Score</p>
                  <p className="text-4xl font-mono font-black text-slate-200">{participant?.score || 0} PTS</p>
                </div>
              </div>
            ) : myRankEntry && myRankEntry.rank === 3 ? (
              /* 3rd Place Bronze Card */
              <div className="bg-gradient-to-b from-[#241710] to-[#0f172a] border-2 border-amber-700 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-4 glow-bronze">
                <span className="text-5xl block animate-bounce-short">🥉</span>
                <div className="space-y-1">
                  <div className="bg-amber-700 text-amber-100 font-black px-4 py-1 rounded-full text-xs uppercase tracking-widest inline-block shadow">
                    PODIUM FINISHER
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white font-['Outfit']">3RD PLACE FINISH!</h3>
                  <p className="text-amber-400 text-xs font-semibold">Brilliant victory in the arena</p>
                </div>

                <div className="bg-slate-900/90 p-5 rounded-2xl border border-amber-800/40 space-y-1">
                  <p className="text-xs uppercase tracking-wider text-slate-400">Final Score</p>
                  <p className="text-4xl font-mono font-black text-amber-500">{participant?.score || 0} PTS</p>
                </div>
              </div>
            ) : (
              /* Other Finisher Card */
              <div className="bg-[#151c2e] border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-5">
                <Award className="w-14 h-14 text-amber-400 mx-auto animate-pulse" />
                <div className="space-y-1">
                  <h3 className="text-2xl sm:text-3xl font-black text-white font-['Outfit']">QUIZ COMPLETE!</h3>
                  <p className="text-xs text-slate-400">Thank you for competing in ASI Quiz Arena</p>
                </div>

                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-700 space-y-2">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Final Score</p>
                  <p className="text-4xl font-mono font-black text-amber-400">{participant?.score || 0} PTS</p>
                  {myRankEntry && (
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-center gap-2">
                      <span className="text-xs text-slate-400">Final Standing:</span>
                      <span className="text-base font-black text-rose-400 font-mono">Rank #{myRankEntry.rank}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 text-slate-400 text-xs text-center space-y-1">
              <p className="font-bold text-slate-300">Analytics Society of India — Student Chapter</p>
              <p className="text-[11px] text-slate-500">Official Certificate & Results recorded</p>
            </div>
          </div>
        )}
      </main>

      <footer className="py-3 text-center text-xs text-slate-600 border-t border-slate-900">
        Analytics Society of India — Student Chapter
      </footer>
    </div>
  );
};
