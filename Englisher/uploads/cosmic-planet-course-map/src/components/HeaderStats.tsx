import React from 'react';
import { UserStats, Course } from '../types';
import { Flame, Sparkles, Star, Volume2, VolumeX, ShoppingBag, BookOpen, Layers } from 'lucide-react';
import { sounds } from '../lib/sound';

interface HeaderStatsProps {
  userStats: UserStats;
  courses: Course[];
  activeCourseId: string;
  onSelectCourse: (courseId: string) => void;
  onToggleSound: () => void;
  onOpenShop: () => void;
  onOpenCodex: () => void;
}

export const HeaderStats: React.FC<HeaderStatsProps> = ({
  userStats,
  courses,
  activeCourseId,
  onSelectCourse,
  onToggleSound,
  onOpenShop,
  onOpenCodex,
}) => {
  const activeCourse = courses.find((c) => c.id === activeCourseId) || courses[0];

  // Calculate XP needed for next level
  const currentLevel = Math.floor(userStats.xp / 300) + 1;
  const xpInCurrentLevel = userStats.xp % 300;
  const levelProgress = Math.min(100, (xpInCurrentLevel / 300) * 100);

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-slate-950/70 border-b border-purple-500/20 px-4 py-3 shadow-2xl">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Course Switcher & Title */}
        <div className="flex items-center gap-3">
          <div className="relative group">
            <select
              value={activeCourseId}
              onChange={(e) => {
                sounds.playClick();
                onSelectCourse(e.target.value);
              }}
              className="appearance-none bg-slate-900/90 hover:bg-slate-800 text-purple-200 font-bold text-xs sm:text-sm py-2 pl-9 pr-8 rounded-xl border border-purple-500/40 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id} className="bg-slate-900 text-white">
                  {course.title}
                </option>
              ))}
            </select>
            <Layers className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Center: Gamification Stats Bar */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Level Progress Meter */}
          <div className="hidden md:flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-purple-500/30">
            <span className="text-xs font-bold text-purple-300">Lvl {currentLevel}</span>
            <div className="w-20 h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full transition-all duration-500"
                style={{ width: `${levelProgress}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-slate-400">{userStats.xp} XP</span>
          </div>

          {/* Streak Badge */}
          <div className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-500/30 px-2.5 py-1.5 rounded-xl">
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
            <span className="text-xs sm:text-sm font-black text-amber-300">{userStats.streakDays}d</span>
          </div>

          {/* Stardust / Gems Badge */}
          <div className="flex items-center gap-1.5 bg-pink-950/40 border border-pink-500/30 px-2.5 py-1.5 rounded-xl">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span className="text-xs sm:text-sm font-black text-pink-200">{userStats.stardust}</span>
          </div>

          {/* Stars Collected */}
          <div className="flex items-center gap-1.5 bg-yellow-950/40 border border-yellow-500/30 px-2.5 py-1.5 rounded-xl">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-xs sm:text-sm font-black text-yellow-200">{userStats.stars}</span>
          </div>
        </div>

        {/* Right: Actions (Sound, Shop, Codex) */}
        <div className="flex items-center gap-2">
          {/* Codex Button */}
          <button
            onClick={() => {
              sounds.playClick();
              onOpenCodex();
            }}
            title="Planet Codex"
            className="p-2 rounded-xl bg-slate-900/90 border border-slate-700 hover:border-purple-400 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
          </button>

          {/* Space Shop Button */}
          <button
            onClick={() => {
              sounds.playClick();
              onOpenShop();
            }}
            title="Cosmic Shop"
            className="p-2 rounded-xl bg-purple-900/60 border border-purple-500/40 hover:bg-purple-800/80 text-purple-200 transition cursor-pointer relative"
          >
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-pink-300" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-pink-500"></span>
            </span>
          </button>

          {/* Audio Toggle Button */}
          <button
            onClick={() => {
              onToggleSound();
            }}
            title={userStats.soundEnabled ? 'Mute Sound' : 'Enable Sound'}
            className="p-2 rounded-xl bg-slate-900/90 border border-slate-700 hover:border-purple-400 text-slate-300 hover:text-white transition cursor-pointer"
          >
            {userStats.soundEnabled ? (
              <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
