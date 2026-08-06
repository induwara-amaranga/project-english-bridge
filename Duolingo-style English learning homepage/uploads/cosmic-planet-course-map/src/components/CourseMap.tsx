import React from 'react';
import { motion } from 'motion/react';
import { Course, PlanetNodeData, PlanetStatus, UserStats } from '../types';
import { PlanetNode } from './PlanetNode';
import { Sparkles, Compass, Rocket } from 'lucide-react';

interface CourseMapProps {
  course: Course;
  userStats: UserStats;
  onSelectPlanet: (planet: PlanetNodeData) => void;
}

export const CourseMap: React.FC<CourseMapProps> = ({
  course,
  userStats,
  onSelectPlanet,
}) => {
  // Collect all planets across sectors in sequence
  const allPlanets: { planet: PlanetNodeData; sectorTitle: string; sectorColor: string }[] = [];
  course.sectors.forEach((sector) => {
    sector.planets.forEach((planet) => {
      allPlanets.push({
        planet,
        sectorTitle: sector.title,
        sectorColor: sector.color,
      });
    });
  });

  const getPlanetStatus = (planet: PlanetNodeData): PlanetStatus => {
    if (userStats.completedPlanetIds.includes(planet.id)) {
      return 'completed';
    }
    if (planet.id === userStats.currentPlanetId) {
      return 'in_progress';
    }
    // Check if prerequisite is completed or if it's the very first planet
    if (!planet.prerequisiteId) {
      return 'in_progress';
    }
    if (userStats.completedPlanetIds.includes(planet.prerequisiteId)) {
      return 'in_progress';
    }
    return 'locked';
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto px-4 py-8 min-h-screen">
      {/* Course Header Banner */}
      <div className="text-center mb-12 relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs sm:text-sm font-semibold mb-3 backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>CELESTIAL STAGE SYSTEM</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-indigo-300 tracking-tight drop-shadow-md">
          {course.title}
        </h1>
        <p className="text-slate-300 text-sm sm:text-base max-w-lg mx-auto mt-2 font-medium">
          {course.description}
        </p>
      </div>

      {/* Render Sectors and Planets along Winding Path */}
      <div className="relative">
        {course.sectors.map((sector) => (
          <div key={sector.id} className="relative mb-20">
            {/* Sector Divider Banner */}
            <div className="sticky top-20 z-20 my-8 flex items-center justify-center">
              <div 
                className="px-6 py-2.5 rounded-2xl bg-slate-900/80 border backdrop-blur-md shadow-xl flex items-center gap-3"
                style={{ borderColor: `${sector.color}50` }}
              >
                <Compass className="w-5 h-5" style={{ color: sector.color }} />
                <div className="text-left">
                  <h3 className="text-xs sm:text-sm font-bold text-white tracking-wider uppercase">
                    {sector.title}
                  </h3>
                  <p className="text-[11px] text-slate-400">{sector.subtitle}</p>
                </div>
              </div>
            </div>

            {/* Planets in Sector */}
            <div className="flex flex-col items-center relative space-y-16 sm:space-y-24">
              {sector.planets.map((planet) => {
                const status = getPlanetStatus(planet);
                const isCurrent = planet.id === userStats.currentPlanetId;
                const progressPercent = userStats.planetProgress[planet.id] || 0;

                return (
                  <div
                    key={planet.id}
                    className="w-full flex justify-center"
                    style={{
                      // Translate horizontally according to position.x (zigzag path)
                      transform: `translateX(${(planet.position.x - 50) * 1.8}px)`,
                    }}
                  >
                    <PlanetNode
                      planet={planet}
                      status={status}
                      progressPercent={progressPercent}
                      isActiveCurrent={isCurrent}
                      activeAvatarId={userStats.activeAvatarId}
                      activeHatId={userStats.activeHatId}
                      onSelect={onSelectPlanet}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Final Cosmic Gate / Mastery Landmark */}
      <div className="flex flex-col items-center justify-center my-16 text-center z-10 relative">
        <motion.div
          animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
          className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-[0_0_35px_rgba(245,158,11,0.6)] border-4 border-yellow-200"
        >
          <Rocket className="w-10 h-10 text-slate-950" />
        </motion.div>

        <h3 className="text-xl font-bold text-yellow-200 mt-4 tracking-wide">
          Cosmic Mastery Pinnacle
        </h3>
        <p className="text-xs text-slate-400 max-w-xs mt-1">
          Complete all planetary stages to achieve ultimate interstellar language fluency!
        </p>
      </div>
    </div>
  );
};
