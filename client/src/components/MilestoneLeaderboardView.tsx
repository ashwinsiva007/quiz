import React from 'react';
import { LeaderboardEntry } from '../types';
import { Sparkles, Clock, SkipForward, Flame, Trophy, Medal, ChevronUp } from 'lucide-react';

interface MilestoneLeaderboardViewProps {
  leaderboard: LeaderboardEntry[];
  timeLeft: number;
  onNextQuestion: () => void;
}

export const MilestoneLeaderboardView: React.FC<MilestoneLeaderboardViewProps> = ({
  leaderboard,
  timeLeft,
  onNextQuestion
}) => {
  const top3 = leaderboard.slice(0, 3);
  const remaining = leaderboard.slice(3, 8);

  const getRankStyle = (rank: number) => {
    if (rank === 1) return { bg: 'bg-amber-500/20 border-amber-400/80 text-amber-400', icon: '🥇', label: '1ST' };
    if (rank === 2) return { bg: 'bg-slate-300/20 border-slate-300/80 text-slate-200', icon: '🥈', label: '2ND' };
    if (rank === 3) return { bg: 'bg-amber-700/20 border-amber-600/80 text-amber-500', icon: '🥉', label: '3RD' };
    return { bg: 'bg-slate-800 border-slate-700 text-slate-400', icon: `#${rank}`, label: `#${rank}` };
  };

  return (
    <div className="max-w-4xl mx-auto w-full my-auto space-y-6">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 border border-amber-500/40 px-4 py-1.5 rounded-full text-amber-400 text-xs font-black uppercase tracking-widest shadow-md">
          <Sparkles className="w-4 h-4 text-amber-300" />
          ARENA LEADERBOARD STANDINGS
          <Sparkles className="w-4 h-4 text-amber-300" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-white font-['Outfit'] tracking-tight">
          TOP CONTENDERS
        </h2>
      </div>

      {/* Top 3 Spotlight Podium Cards */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {top3.map((entry, idx) => {
            const rank = idx + 1;
            const style = getRankStyle(rank);
            const isFirst = rank === 1;

            return (
              <div
                key={entry.name}
                className={`rounded-2xl p-4 text-center border-2 transition-all flex flex-col justify-between ${
                  isFirst
                    ? 'bg-gradient-to-b from-amber-950/40 to-slate-900 border-amber-400/80 glow-gold sm:-translate-y-2'
                    : 'bg-slate-900/90 border-slate-700/80'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`w-8 h-8 rounded-xl font-mono font-black text-sm flex items-center justify-center border ${style.bg}`}>
                    {style.icon}
                  </span>
                  {entry.lastQuestionScore > 0 && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-400" />
                      +{entry.lastQuestionScore}
                    </span>
                  )}
                </div>

                <div className="py-2">
                  <h4 className="text-lg font-black text-white truncate font-['Outfit']" title={entry.name}>
                    {entry.name}
                  </h4>
                  <p className={`text-2xl font-mono font-black mt-1 ${isFirst ? 'text-amber-400' : 'text-slate-200'}`}>
                    {entry.score} <span className="text-xs font-sans font-bold text-slate-400">PTS</span>
                  </p>
                </div>

                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-950/60 py-1 px-2 rounded-lg border border-slate-800">
                  {style.label} POSITION
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ranks 4 to 8 list */}
      {remaining.length > 0 && (
        <div className="space-y-2.5">
          {remaining.map((entry) => (
            <div
              key={entry.name}
              className="bg-[#151c2e] border border-slate-800 hover:border-slate-700 px-4 py-3 rounded-2xl flex items-center justify-between shadow-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-slate-900 font-mono font-black text-slate-300 flex items-center justify-center text-sm border border-slate-700">
                  #{entry.rank}
                </span>
                <div>
                  <h4 className="text-base font-bold text-white">{entry.name}</h4>
                  {entry.lastQuestionScore > 0 && (
                    <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                      <ChevronUp className="w-3 h-3" /> +{entry.lastQuestionScore} pts this round
                    </span>
                  )}
                </div>
              </div>

              <span className="text-xl font-mono font-black text-amber-400">
                {entry.score} PTS
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Host Controls & Countdown Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold text-emerald-300 shadow-md">
          <Clock className="w-4 h-4 animate-spin text-emerald-400" />
          <span>⚡ Next question starting in <strong className="text-emerald-400 font-mono text-sm">{timeLeft > 0 ? timeLeft : 1}s</strong> (Auto)</span>
        </div>

        <button
          onClick={onNextQuestion}
          className="py-3 px-8 rounded-2xl font-black text-base bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white shadow-xl shadow-rose-900/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
        >
          <SkipForward className="w-5 h-5" />
          NEXT QUESTION NOW →
        </button>
      </div>
    </div>
  );
};
