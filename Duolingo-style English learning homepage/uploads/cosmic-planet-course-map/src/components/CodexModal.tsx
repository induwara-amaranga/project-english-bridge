import React from 'react';
import { motion } from 'motion/react';
import { Course, UserStats } from '../types';
import { X, BookOpen, Globe, Lock, CheckCircle2, Award } from 'lucide-react';
import { sounds } from '../lib/sound';

interface CodexModalProps {
  course: Course;
  userStats: UserStats;
  onClose: () => void;
}

export const CodexModal: React.FC<CodexModalProps> = ({
  course,
  userStats,
  onClose,
}) => {
  const allPlanets = course.sectors.flatMap((s) => s.planets);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-2xl bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <button
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 z-20 p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-full transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
          <div className="p-3 bg-indigo-950/80 border border-indigo-500/30 rounded-2xl text-indigo-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Galactic Codex</h2>
            <p className="text-xs text-slate-400">
              Celestial lore and planetary archives discovered during your journey.
            </p>
          </div>
        </div>

        <div className="overflow-y-auto space-y-4 pr-1 custom-scrollbar">
          {allPlanets.map((planet) => {
            const isDiscovered =
              userStats.completedPlanetIds.includes(planet.id) ||
              planet.id === userStats.currentPlanetId;

            return (
              <div
                key={planet.id}
                className={`p-4 rounded-2xl border flex items-start gap-4 transition ${
                  isDiscovered
                    ? 'bg-slate-950/60 border-indigo-500/30'
                    : 'bg-slate-950/30 border-slate-900 opacity-60'
                }`}
              >
                {/* Planet Preview Circle */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 border border-white/20 text-white font-extrabold text-sm shadow-md"
                  style={{
                    backgroundColor: isDiscovered ? planet.colorPrimary : '#1E293B',
                  }}
                >
                  {isDiscovered ? planet.number : <Lock className="w-5 h-5 text-slate-500" />}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-base text-white">{planet.title}</h4>
                    {isDiscovered && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Discovered
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-indigo-300 font-semibold mt-0.5">
                    {planet.category} • {planet.type.replace('_', ' ').toUpperCase()}
                  </p>

                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {isDiscovered ? planet.lore : '??? Secrets hidden until unlocked in space exploration.'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
