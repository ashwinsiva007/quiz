import React from 'react';

interface BrandingHeaderProps {
  compact?: boolean;
}

export const BrandingHeader: React.FC<BrandingHeaderProps> = ({ compact = false }) => {
  return (
    <div className={`text-center ${compact ? 'py-3 px-4' : 'py-6 px-4'} border-b border-slate-800/80 bg-[#0d1322]`}>
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center">
        
        {/* Logos & Crest */}
        <div className="flex items-center justify-center gap-4 mb-2">
          {/* ASI Badge */}
          <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-500/30 px-3 py-1 rounded-full">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></div>
            <span className="text-xs font-bold tracking-wider text-rose-400 uppercase">ASI Student Chapter</span>
          </div>
          
          {/* SIET Badge */}
          <div className="flex items-center gap-2 bg-amber-950/30 border border-amber-500/30 px-3 py-1 rounded-full">
            <span className="text-xs font-semibold tracking-wider text-amber-400">SIET</span>
          </div>
        </div>

        {/* Title */}
        <h1 className={`font-black tracking-tight text-white ${compact ? 'text-xl sm:text-2xl' : 'text-3xl sm:text-4xl md:text-5xl'} font-['Outfit']`}>
          ASI QUIZ <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-amber-400 to-rose-400">ARENA</span>
        </h1>

        {/* Subtitle */}
        <p className={`font-semibold tracking-widest text-rose-400 uppercase ${compact ? 'text-xs mt-0.5' : 'text-sm sm:text-base mt-1'}`}>
          Demystifying Artificial Intelligence
        </p>

        {!compact && (
          <div className="mt-2 text-xs sm:text-sm text-slate-400 space-y-0.5">
            <p className="font-medium text-slate-300">ANALYTICS SOCIETY OF INDIA — STUDENT CHAPTER</p>
            <p className="text-slate-400">Sri Shakthi Institute of Engineering and Technology</p>
          </div>
        )}
      </div>
    </div>
  );
};
