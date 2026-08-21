import confetti from 'canvas-confetti';
import { LeaderboardEntry } from '../types';

/**
 * Multi-stage Grand Finale celebration barrage
 */
export const fireGrandFinaleConfetti = () => {
  const duration = 3.5 * 1000;
  const animationEnd = Date.now() + duration;

  const defaults = { startVelocity: 30, spread: 360, ticks: 70, zIndex: 100 };

  const interval: ReturnType<typeof setInterval> = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    // Left cannon
    confetti({
      ...defaults,
      particleCount,
      origin: { x: 0.15, y: 0.7 },
      colors: ['#f59e0b', '#fbbf24', '#e11d48', '#ffffff', '#06b6d4']
    });

    // Right cannon
    confetti({
      ...defaults,
      particleCount,
      origin: { x: 0.85, y: 0.7 },
      colors: ['#f59e0b', '#fbbf24', '#e11d48', '#ffffff', '#06b6d4']
    });
  }, 250);
};

/**
 * Targeted confetti for individual podium reveals
 */
export const firePodiumConfetti = (rank: number) => {
  if (rank === 1) {
    // Grand Champion Golden Blast
    confetti({
      particleCount: 120,
      spread: 100,
      origin: { y: 0.5, x: 0.5 },
      colors: ['#fbbf24', '#f59e0b', '#d97706', '#ffffff', '#e11d48'],
      startVelocity: 45,
    });
  } else if (rank === 2) {
    // Silver Blast
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.6, x: 0.3 },
      colors: ['#e2e8f0', '#cbd5e1', '#94a3b8', '#38bdf8'],
      startVelocity: 35,
    });
  } else if (rank === 3) {
    // Bronze Blast
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.65, x: 0.7 },
      colors: ['#d97706', '#b45309', '#f59e0b', '#fed7aa'],
      startVelocity: 30,
    });
  }
};

/**
 * Pure Web Audio API brass triumph chord synthesizer (No external audio file dependencies)
 */
export const playVictoryFanfare = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // Fanfare melody notes: C4 -> E4 -> G4 -> C5 sustained major chord
    const notes = [
      { freq: 523.25, time: 0.0, dur: 0.2 }, // C5
      { freq: 659.25, time: 0.2, dur: 0.2 }, // E5
      { freq: 783.99, time: 0.4, dur: 0.2 }, // G5
      { freq: 1046.50, time: 0.65, dur: 1.2 }, // C6 grand finish
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + dur + 0.1);
    });
  } catch (err) {
    console.log('Audio playback prevented or unsupported:', err);
  }
};

/**
 * Short chime for individual podium step reveal
 */
export const playRevealChime = (rank: number) => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const baseFreq = rank === 1 ? 880 : rank === 2 ? 660 : 550;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (err) {
    console.log('Audio chime error:', err);
  }
};

/**
 * Export results to CSV for organizers & faculty
 */
export const exportLeaderboardToCSV = (leaderboard: LeaderboardEntry[], quizTitle: string = 'ASI_Quiz_Arena') => {
  if (!leaderboard || leaderboard.length === 0) return;

  const headers = ['Rank', 'Participant Name', 'Total Score (PTS)', 'Last Round Gain'];
  const rows = leaderboard.map(entry => [
    entry.rank,
    `"${entry.name.replace(/"/g, '""')}"`,
    entry.score,
    entry.lastQuestionScore || 0
  ]);

  const csvContent = [
    `# ${quizTitle} - Official Final Results`,
    `# Date: ${new Date().toLocaleString()}`,
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${quizTitle}_Results_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
