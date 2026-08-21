import React, { useState, useEffect } from 'react';
import { LeaderboardEntry } from '../types';
import { 
  Trophy, 
  Crown, 
  Medal, 
  Sparkles, 
  Download, 
  Volume2, 
  PartyPopper, 
  ChevronRight, 
  Eye, 
  Flame, 
  RotateCcw,
  Users
} from 'lucide-react';
import { 
  fireGrandFinaleConfetti, 
  firePodiumConfetti, 
  playVictoryFanfare, 
  playRevealChime, 
  exportLeaderboardToCSV 
} from '../utils/celebration';

interface PodiumFinaleViewProps {
  leaderboard: LeaderboardEntry[];
  onResetQuiz: () => void;
}

export const PodiumFinaleView: React.FC<PodiumFinaleViewProps> = ({ leaderboard, onResetQuiz }) => {
  // Reveal steps: 0 = hidden, 1 = 3rd place revealed, 2 = 2nd place revealed, 3 = 1st place champion revealed
  const [revealStep, setRevealStep] = useState<number>(() => {
    // If there are less than 3 participants, show all immediately
    return leaderboard.length < 3 ? 3 : 0;
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const firstPlace = leaderboard[0];
  const secondPlace = leaderboard[1];
  const thirdPlace = leaderboard[2];
  const restOfLeaderboard = leaderboard.slice(3);

  // Auto fanfare & confetti on 1st place reveal
  useEffect(() => {
    if (revealStep === 3) {
      fireGrandFinaleConfetti();
      if (soundEnabled) {
        playVictoryFanfare();
      }
    }
  }, [revealStep, soundEnabled]);

  const handleRevealNext = () => {
    if (revealStep === 0) {
      // Reveal 3rd place
      setRevealStep(1);
      firePodiumConfetti(3);
      if (soundEnabled) playRevealChime(3);
    } else if (revealStep === 1) {
      // Reveal 2nd place
      setRevealStep(2);
      firePodiumConfetti(2);
      if (soundEnabled) playRevealChime(2);
    } else if (revealStep === 2) {
      // Reveal 1st place (Grand Champion)
      setRevealStep(3);
    }
  };

  const handleRevealAll = () => {
    setRevealStep(3);
    fireGrandFinaleConfetti();
    if (soundEnabled) playVictoryFanfare();
  };

  const handleManualConfetti = () => {
    fireGrandFinaleConfetti();
  };

  const handleManualFanfare = () => {
    playVictoryFanfare();
  };

  const handleExportCSV = () => {
    exportLeaderboardToCSV(leaderboard, 'ASI_Quiz_Arena_Grand_Finale');
  };

  return (
    <div className="w-full max-w-7xl mx-auto my-auto space-y-6 py-2">
      {/* Top Banner & Celebration Header */}
      <div className="text-center space-y-2 relative">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 border border-amber-500/40 px-5 py-1.5 rounded-full text-amber-400 text-xs sm:text-sm font-black uppercase tracking-widest shadow-lg animate-pulse">
          <Sparkles className="w-4 h-4 text-amber-300" />
          OFFICIAL GRAND FINALE
          <Sparkles className="w-4 h-4 text-amber-300" />
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-400 to-amber-200 font-['Outfit'] tracking-tight drop-shadow-md">
          CHAMPIONSHIP PODIUM
        </h1>
        <p className="text-rose-300/90 font-semibold text-sm sm:text-base uppercase tracking-wider">
          Analytics Society of India — Quiz Arena
        </p>
      </div>

      {/* Reveal Step Controller (for interactive auditorium stage presentation) */}
      {revealStep < 3 && (
        <div className="bg-[#151c2e]/90 border border-amber-500/30 p-4 rounded-2xl max-w-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
          <div className="text-left">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
              Auditorium Stage Reveal
            </span>
            <span className="text-sm font-semibold text-slate-200">
              {revealStep === 0 && 'Ready to announce 3rd Place?'}
              {revealStep === 1 && '3rd Place Revealed! Next: 2nd Place'}
              {revealStep === 2 && '2nd Place Revealed! Next: GRAND CHAMPION!'}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleRevealNext}
              className="flex-1 sm:flex-initial py-2.5 px-5 rounded-xl font-black text-sm bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-amber-900/30 transition-all hover:scale-105"
            >
              <Eye className="w-4 h-4" />
              {revealStep === 0 && 'Reveal 3rd Place'}
              {revealStep === 1 && 'Reveal 2nd Place'}
              {revealStep === 2 && 'Reveal Champion! 👑'}
            </button>
            <button
              onClick={handleRevealAll}
              className="py-2.5 px-3 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Reveal all podium positions immediately"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Podium Stage Grid (16:9 Smart Board Scale) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 items-end pt-4 max-w-5xl mx-auto">
        
        {/* ================= 2ND PLACE PODIUM (SILVER) ================= */}
        <div className="order-2 md:order-1 flex flex-col items-center">
          {secondPlace && revealStep >= 2 ? (
            <div className="w-full bg-gradient-to-b from-[#1e293b] to-[#0f172a] border-2 border-slate-300/80 rounded-3xl p-5 lg:p-6 text-center shadow-2xl flex flex-col justify-between h-[340px] lg:h-[380px] glow-silver relative podium-shimmer transition-all animate-bounce-short">
              {/* Badge top */}
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-slate-200 to-slate-400 text-slate-950 font-black px-4 py-1 rounded-full text-xs uppercase tracking-widest shadow-lg border border-white flex items-center gap-1.5">
                <Medal className="w-3.5 h-3.5 text-slate-800" />
                2ND PLACE
              </div>

              {/* Medal Icon & Rank */}
              <div className="pt-2">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-700/60 border-2 border-slate-300 flex items-center justify-center text-4xl shadow-inner">
                  🥈
                </div>
              </div>

              {/* Name & Score */}
              <div className="space-y-1 my-auto">
                <h3 className="text-xl lg:text-2xl font-black text-white truncate px-2 font-['Outfit']" title={secondPlace.name}>
                  {secondPlace.name}
                </h3>
                <p className="text-2xl lg:text-3xl font-mono font-black text-slate-200 drop-shadow">
                  {secondPlace.score} <span className="text-sm font-sans font-bold text-slate-400">PTS</span>
                </p>
                {secondPlace.lastQuestionScore > 0 && (
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full inline-block">
                    +{secondPlace.lastQuestionScore} in finale
                  </span>
                )}
              </div>

              {/* Pedestal Base */}
              <div className="bg-slate-800/90 border border-slate-600/50 text-slate-200 font-extrabold py-2 px-4 rounded-2xl text-xs uppercase tracking-wider shadow-md">
                Runner-Up
              </div>
            </div>
          ) : (
            <div className="w-full bg-[#151c2e]/60 border-2 border-dashed border-slate-700/60 rounded-3xl p-6 text-center h-[340px] lg:h-[380px] flex flex-col items-center justify-center text-slate-500">
              <span className="text-4xl opacity-30 mb-2">🥈</span>
              <span className="text-xs font-bold uppercase tracking-wider">2nd Place Locked</span>
              <span className="text-[11px] text-slate-600 mt-1">Awaiting reveal</span>
            </div>
          )}
        </div>

        {/* ================= 1ST PLACE PODIUM (GRAND CHAMPION GOLD) ================= */}
        <div className="order-1 md:order-2 flex flex-col items-center">
          {firstPlace && revealStep >= 3 ? (
            <div className="w-full bg-gradient-to-b from-[#2a1c06] via-[#1a1408] to-[#0f172a] border-4 border-amber-400 rounded-3xl p-6 lg:p-8 text-center shadow-2xl flex flex-col justify-between h-[400px] lg:h-[450px] glow-champion relative podium-shimmer transition-all">
              {/* Crown Top Floating Aura */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <Crown className="w-10 h-10 text-amber-300 animate-crown-pulse drop-shadow-[0_0_15px_rgba(251,191,36,0.9)]" />
                <div className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-slate-950 font-black px-5 py-1 rounded-full text-xs uppercase tracking-widest shadow-xl border-2 border-white flex items-center gap-1.5 -mt-1">
                  <Trophy className="w-3.5 h-3.5 fill-current" />
                  GRAND CHAMPION
                </div>
              </div>

              {/* Big Gold Trophy */}
              <div className="pt-4">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/20 border-2 border-amber-400/80 flex items-center justify-center text-5xl shadow-2xl animate-trophy-float">
                  🏆
                </div>
              </div>

              {/* Champion Name & Massive Score */}
              <div className="space-y-1.5 my-auto">
                <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 uppercase tracking-widest bg-amber-950/80 border border-amber-500/40 px-3 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  1ST PLACE WINNER
                </div>
                <h2 className="text-2xl lg:text-3xl font-black text-white truncate px-2 font-['Outfit'] drop-shadow-lg" title={firstPlace.name}>
                  {firstPlace.name}
                </h2>
                <div className="text-4xl lg:text-5xl font-mono font-black text-amber-400 drop-shadow-[0_0_20px_rgba(245,158,11,0.6)]">
                  {firstPlace.score} <span className="text-base font-sans font-bold text-amber-200">PTS</span>
                </div>
                {firstPlace.lastQuestionScore > 0 && (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-3 py-0.5 rounded-full inline-block">
                    +{firstPlace.lastQuestionScore} pts final round
                  </span>
                )}
              </div>

              {/* Golden Champion Pedestal Base */}
              <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950 font-black py-2.5 px-6 rounded-2xl text-sm uppercase tracking-widest shadow-lg shadow-amber-900/50">
                ASI QUIZ TITAN
              </div>
            </div>
          ) : (
            <div className="w-full bg-[#151c2e]/60 border-2 border-dashed border-amber-500/40 rounded-3xl p-6 text-center h-[400px] lg:h-[450px] flex flex-col items-center justify-center text-amber-400/60">
              <Crown className="w-12 h-12 text-amber-500/40 animate-pulse mb-2" />
              <span className="text-sm font-black uppercase tracking-wider text-amber-400/70">Grand Champion Locked</span>
              <span className="text-xs text-slate-500 mt-1">The crowning moment awaits</span>
            </div>
          )}
        </div>

        {/* ================= 3RD PLACE PODIUM (BRONZE) ================= */}
        <div className="order-3 md:order-3 flex flex-col items-center">
          {thirdPlace && revealStep >= 1 ? (
            <div className="w-full bg-gradient-to-b from-[#241710] to-[#0f172a] border-2 border-amber-700/80 rounded-3xl p-5 lg:p-6 text-center shadow-2xl flex flex-col justify-between h-[300px] lg:h-[330px] glow-bronze relative podium-shimmer transition-all animate-bounce-short">
              {/* Badge top */}
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-700 to-amber-800 text-amber-100 font-black px-4 py-1 rounded-full text-xs uppercase tracking-widest shadow-lg border border-amber-600 flex items-center gap-1.5">
                <Medal className="w-3.5 h-3.5 text-amber-300" />
                3RD PLACE
              </div>

              {/* Medal Icon & Rank */}
              <div className="pt-2">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-900/40 border-2 border-amber-700/80 flex items-center justify-center text-3xl shadow-inner">
                  🥉
                </div>
              </div>

              {/* Name & Score */}
              <div className="space-y-1 my-auto">
                <h3 className="text-lg lg:text-xl font-black text-white truncate px-2 font-['Outfit']" title={thirdPlace.name}>
                  {thirdPlace.name}
                </h3>
                <p className="text-2xl lg:text-3xl font-mono font-black text-amber-500 drop-shadow">
                  {thirdPlace.score} <span className="text-sm font-sans font-bold text-slate-400">PTS</span>
                </p>
                {thirdPlace.lastQuestionScore > 0 && (
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full inline-block">
                    +{thirdPlace.lastQuestionScore} in finale
                  </span>
                )}
              </div>

              {/* Pedestal Base */}
              <div className="bg-amber-950/80 border border-amber-800/50 text-amber-400 font-extrabold py-2 px-4 rounded-2xl text-xs uppercase tracking-wider shadow-md">
                2nd Runner-Up
              </div>
            </div>
          ) : (
            <div className="w-full bg-[#151c2e]/60 border-2 border-dashed border-slate-700/60 rounded-3xl p-6 text-center h-[300px] lg:h-[330px] flex flex-col items-center justify-center text-slate-500">
              <span className="text-4xl opacity-30 mb-2">🥉</span>
              <span className="text-xs font-bold uppercase tracking-wider">3rd Place Locked</span>
              <span className="text-[11px] text-slate-600 mt-1">Awaiting reveal</span>
            </div>
          )}
        </div>
      </div>

      {/* Rest of Leaderboard (Honor Roll 4th to 10th+) */}
      {restOfLeaderboard.length > 0 && revealStep === 3 && (
        <div className="bg-[#151c2e]/90 border border-slate-800 rounded-3xl p-5 lg:p-6 max-w-5xl mx-auto shadow-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-300">
                Honor Roll (Ranks 4 – {leaderboard.length})
              </h4>
            </div>
            <span className="text-xs text-slate-400 font-semibold">
              {leaderboard.length} Total Contenders
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
            {restOfLeaderboard.map((entry) => (
              <div
                key={entry.name}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 p-3 rounded-2xl flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 font-mono font-black text-xs flex items-center justify-center shrink-0 border border-slate-700">
                    #{entry.rank}
                  </span>
                  <span className="text-sm font-bold text-slate-200 truncate" title={entry.name}>
                    {entry.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {entry.lastQuestionScore > 0 && (
                    <span className="text-[10px] text-emerald-400 font-bold hidden sm:inline">
                      +{entry.lastQuestionScore}
                    </span>
                  )}
                  <span className="text-sm font-mono font-black text-amber-400">
                    {entry.score} PTS
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Smart Board Interactive Action Toolbar */}
      <div className="bg-[#151c2e] border border-slate-800 rounded-2xl p-4 max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          {/* Confetti Blast Trigger */}
          <button
            onClick={handleManualConfetti}
            className="py-2.5 px-4 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all flex items-center gap-2 active:scale-95"
            title="Shower stage with confetti"
          >
            <PartyPopper className="w-4 h-4" />
            Confetti Shower
          </button>

          {/* Victory Fanfare Chime Trigger */}
          <button
            onClick={handleManualFanfare}
            className="py-2.5 px-4 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all flex items-center gap-2 active:scale-95"
            title="Play Victory Fanfare Chimes"
          >
            <Volume2 className="w-4 h-4" />
            Victory Fanfare
          </button>

          {/* Export Results to CSV */}
          <button
            onClick={handleExportCSV}
            className="py-2.5 px-4 rounded-xl text-xs font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-all flex items-center gap-2"
            title="Download CSV rankings for records"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Reset Quiz action */}
        <button
          onClick={onResetQuiz}
          className="py-2.5 px-5 rounded-xl text-xs font-black bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 transition-all flex items-center gap-2 ml-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          START NEW QUIZ
        </button>
      </div>
    </div>
  );
};
