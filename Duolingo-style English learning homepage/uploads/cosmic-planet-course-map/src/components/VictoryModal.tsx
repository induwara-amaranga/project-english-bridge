import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Star, Sparkles, Trophy, ArrowRight, ShieldCheck } from 'lucide-react';
import { sounds } from '../lib/sound';

interface VictoryModalProps {
  planetTitle: string;
  starsEarned: number;
  xpGained: number;
  stardustGained: number;
  onContinue: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  planetTitle,
  starsEarned,
  xpGained,
  stardustGained,
  onContinue,
}) => {
  useEffect(() => {
    sounds.playLevelUp();
    // Fire cosmic celebration confetti
    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#A855F7', '#EC4899', '#3B82F6', '#10B981', '#FACC15'],
      });
    } catch (e) {
      console.error(e);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="relative w-full max-w-md bg-slate-900 border-2 border-purple-500/50 rounded-3xl p-6 sm:p-8 text-center shadow-2xl overflow-hidden"
      >
        {/* Glowing Background Radial */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-600/20 blur-3xl rounded-full pointer-events-none" />

        {/* Trophy / Star Emblem */}
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/40 mb-4 border-2 border-yellow-200">
          <Trophy className="w-10 h-10 text-slate-950" />
        </div>

        <span className="text-xs font-bold text-emerald-400 tracking-widest uppercase">
          CELESTIAL EXPLORATION UNLOCKED
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
          {planetTitle} Conquered!
        </h2>

        {/* Star Rating Presentation */}
        <div className="flex items-center justify-center gap-2 my-5">
          {[1, 2, 3].map((starIdx) => (
            <motion.div
              key={starIdx}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2 * starIdx, type: 'spring' }}
            >
              <Star
                className={`w-10 h-10 ${
                  starIdx <= starsEarned
                    ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]'
                    : 'text-slate-700 fill-slate-800'
                }`}
              />
            </motion.div>
          ))}
        </div>

        {/* XP & Stardust Reward Cards */}
        <div className="grid grid-cols-2 gap-3 my-6">
          <div className="bg-slate-950/70 border border-purple-500/30 p-3 rounded-2xl">
            <span className="text-[11px] font-bold text-slate-400 uppercase">XP GAINED</span>
            <p className="text-xl font-black text-purple-300 mt-0.5">+{xpGained} XP</p>
          </div>
          <div className="bg-slate-950/70 border border-pink-500/30 p-3 rounded-2xl">
            <span className="text-[11px] font-bold text-slate-400 uppercase">STARDUST</span>
            <p className="text-xl font-black text-pink-300 mt-0.5">+{stardustGained} 💎</p>
          </div>
        </div>

        <button
          onClick={() => {
            sounds.playUnlock();
            onContinue();
          }}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base tracking-wide shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <span>EXPLORE NEXT PLANET</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </motion.div>
    </div>
  );
};
