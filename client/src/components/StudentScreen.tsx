import React from 'react';
import { StudentQuizState } from '../types';
import { socket } from '../socket';
import { BrandingHeader } from './BrandingHeader';
import { CheckCircle2, XCircle, Clock, Trophy, Award, Sparkles } from 'lucide-react';

interface StudentScreenProps {
  quizState: StudentQuizState;
  studentName: string;
  onLeave: () => void;
}

export const StudentScreen: React.FC<StudentScreenProps> = ({ quizState, studentName, onLeave }) => {
  const { state, currentQuestion, timeLeft, timeLimit, participant, studentResult, leaderboard } = quizState;

  const handleSelectOption = (optionIndex: number) => {
    if (state !== 'QUESTION_ACTIVE' || participant?.hasAnswered) return;
    socket.emit('student:submitAnswer', { optionIndex });
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
            {participant?.score || 0} PTS
          </span>
          <button
            onClick={onLeave}
            className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
          >
            Leave
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center p-4 max-w-2xl mx-auto w-full">

        {/* STATE: LOBBY */}
        {state === 'LOBBY' && (
          <div className="bg-[#151c2e] border border-slate-800 rounded-3xl p-8 text-center shadow-2xl glass-panel">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-400 mb-6 border border-emerald-500/20">
              <Sparkles className="w-10 h-10 animate-bounce-short" />
            </div>
            <h2 className="text-3xl font-black text-white font-['Outfit'] mb-2">YOU'RE IN!</h2>
            <p className="text-lg font-semibold text-rose-400 mb-6">Welcome, {studentName}</p>

            <div className="py-4 px-6 bg-slate-900/80 rounded-2xl border border-slate-700/60 inline-flex items-center gap-3 text-slate-300">
              <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping"></div>
              <span className="font-medium text-sm sm:text-base">Waiting for the host to start the quiz...</span>
            </div>
          </div>
        )}

        {/* STATE: QUESTION_ACTIVE */}
        {state === 'QUESTION_ACTIVE' && currentQuestion && (
          <div className="space-y-4">
            {/* Header & Timer */}
            <div className="flex items-center justify-between bg-[#151c2e] px-4 py-3 rounded-2xl border border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                QUESTION {currentQuestion.questionIndex} / {currentQuestion.totalQuestions}
              </span>
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1 rounded-xl">
                <Clock className={`w-4 h-4 ${timeLeft <= 5 ? 'text-rose-500 animate-bounce' : 'text-amber-400'}`} />
                <span className={`font-mono font-black text-lg ${timeLeft <= 5 ? 'text-rose-500' : 'text-white'}`}>
                  {timeLeft}s
                </span>
              </div>
            </div>

            {/* Timer Bar */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ease-linear ${
                  timeLeft <= 5 ? 'bg-rose-500' : 'bg-gradient-to-r from-rose-500 to-amber-400'
                }`}
                style={{ width: `${(timeLeft / timeLimit) * 100}%` }}
              ></div>
            </div>

            {/* Question Text */}
            <div className="bg-[#151c2e] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
              <h3 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
                {currentQuestion.question}
              </h3>
            </div>

            {/* Answer Options or Submitted State */}
            {participant?.hasAnswered ? (
              <div className="bg-emerald-950/40 border-2 border-emerald-500/50 rounded-2xl p-8 text-center space-y-3">
                <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto animate-bounce-short" />
                <h4 className="text-2xl font-black text-emerald-300 font-['Outfit']">ANSWER SUBMITTED</h4>
                <p className="text-sm text-emerald-200/80">✓ Your answer has been locked in. Waiting for timer to end...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                {currentQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full text-left p-5 rounded-2xl font-semibold text-white bg-gradient-to-r ${getOptionStyle(idx)} border shadow-lg active:scale-[0.98] transition-all flex items-start gap-3.5 min-h-[72px]`}
                  >
                    <span className="w-8 h-8 rounded-xl bg-black/30 flex items-center justify-center font-mono font-black text-sm shrink-0 border border-white/20">
                      {getOptionLetter(idx)}
                    </span>
                    <span className="text-base font-medium leading-snug pt-1">
                      {opt.replace(/^[A-D]\.\s*/, '')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STATE: QUESTION_RESULTS */}
        {state === 'QUESTION_RESULTS' && studentResult && (
          <div className="space-y-5">
            {studentResult.isCorrect ? (
              <div className="bg-emerald-950/60 border-2 border-emerald-500/50 rounded-3xl p-8 text-center shadow-2xl space-y-4">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
                <h3 className="text-3xl font-black text-emerald-300 font-['Outfit']">CORRECT!</h3>
                <div className="inline-block bg-emerald-500/20 border border-emerald-400/40 px-5 py-2 rounded-full font-black text-xl text-emerald-300">
                  +{studentResult.lastQuestionScore} POINTS
                </div>
                <div className="text-sm text-slate-300 pt-2">
                  Total Score: <span className="font-bold text-white font-mono">{studentResult.score} PTS</span>
                </div>
              </div>
            ) : (
              <div className="bg-rose-950/60 border-2 border-rose-500/50 rounded-3xl p-8 text-center shadow-2xl space-y-4">
                <XCircle className="w-16 h-16 text-rose-400 mx-auto" />
                <h3 className="text-3xl font-black text-rose-300 font-['Outfit']">NOT QUITE</h3>
                <p className="text-sm text-rose-200">
                  Correct Answer:{' '}
                  <span className="font-bold text-white">
                    {getOptionLetter(studentResult.correctOption)}. {currentQuestion?.options[studentResult.correctOption]?.replace(/^[A-D]\.\s*/, '')}
                  </span>
                </p>
                <div className="text-sm text-slate-300 pt-2">
                  Current Score: <span className="font-bold text-white font-mono">{studentResult.score} PTS</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STATE: LEADERBOARD */}
        {state === 'LEADERBOARD' && (
          <div className="bg-[#151c2e] border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-5">
            <Trophy className="w-12 h-12 text-amber-400 mx-auto" />
            <h3 className="text-2xl font-black text-white font-['Outfit']">LEADERBOARD</h3>
            
            {myRankEntry ? (
              <div className="bg-slate-900/90 border border-amber-500/40 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 font-mono font-black flex items-center justify-center text-lg">
                    #{myRankEntry.rank}
                  </span>
                  <span className="font-bold text-white text-base">{myRankEntry.name}</span>
                </div>
                <span className="font-mono font-black text-amber-400 text-lg">
                  {myRankEntry.score} PTS
                </span>
              </div>
            ) : null}

            <p className="text-xs text-slate-400">Get ready for the next question on the projector!</p>
          </div>
        )}

        {/* STATE: FINISHED */}
        {state === 'FINISHED' && (
          <div className="bg-[#151c2e] border border-slate-800 rounded-3xl p-8 text-center shadow-2xl space-y-6">
            <Award className="w-16 h-16 text-amber-400 mx-auto animate-pulse" />
            <h3 className="text-3xl font-black text-white font-['Outfit']">QUIZ COMPLETE!</h3>
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 space-y-2">
              <p className="text-sm text-slate-400">Final Score</p>
              <p className="text-4xl font-mono font-black text-amber-400">{participant?.score || 0} PTS</p>
              {myRankEntry && (
                <p className="text-sm font-semibold text-rose-400 mt-2">Rank: #{myRankEntry.rank}</p>
              )}
            </div>
            <p className="text-xs text-slate-400">Thank you for participating in ASI Quiz Arena!</p>
          </div>
        )}
      </main>

      <footer className="py-3 text-center text-xs text-slate-600 border-t border-slate-900">
        Analytics Society of India &bull; Sri Shakthi Institute of Engineering and Technology
      </footer>
    </div>
  );
};
