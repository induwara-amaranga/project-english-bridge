import React, { useState, useEffect } from 'react';
import { COURSES } from './data/courses';
import { PlanetNodeData, UserStats } from './types';
import { CosmicBackground } from './components/CosmicBackground';
import { HeaderStats } from './components/HeaderStats';
import { CourseMap } from './components/CourseMap';
import { LessonModal } from './components/LessonModal';
import { VictoryModal } from './components/VictoryModal';
import { SpaceShopModal } from './components/SpaceShopModal';
import { CodexModal } from './components/CodexModal';
import { sounds } from './lib/sound';

const STORAGE_KEY = 'cosmic_course_user_stats_v1';

const INITIAL_STATS: UserStats = {
  xp: 240,
  level: 1,
  stardust: 120,
  stars: 4,
  streakDays: 5,
  currentPlanetId: 'planet_2', // Complex Sentences (60% matching screenshot!)
  completedPlanetIds: ['planet_1'], // Tenses completed
  planetProgress: {
    planet_1: 100,
    planet_2: 60,
  },
  unlockedAvatars: ['zorblax'],
  activeAvatarId: 'zorblax',
  soundEnabled: true,
};

export default function App() {
  const [userStats, setUserStats] = useState<UserStats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_STATS;
  });

  const [activeCourseId, setActiveCourseId] = useState<string>('english_galaxy');
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetNodeData | null>(null);
  const [activeModal, setActiveModal] = useState<'none' | 'lesson' | 'victory' | 'shop' | 'codex'>('none');
  const [victoryDetails, setVictoryDetails] = useState<{
    planetTitle: string;
    stars: number;
    xp: number;
    stardust: number;
  } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userStats));
    } catch (e) {
      console.error(e);
    }
    sounds.setMuted(!userStats.soundEnabled);
  }, [userStats]);

  const activeCourse = COURSES.find((c) => c.id === activeCourseId) || COURSES[0];

  const handleSelectPlanet = (planet: PlanetNodeData) => {
    setSelectedPlanet(planet);
    setActiveModal('lesson');
  };

  const handleFinishStage = (starsEarned: number, xpGained: number, stardustGained: number) => {
    if (!selectedPlanet) return;

    // Determine next planet to unlock in sequence
    const allPlanets = activeCourse.sectors.flatMap((s) => s.planets);
    const currentIndex = allPlanets.findIndex((p) => p.id === selectedPlanet.id);
    const nextPlanet = allPlanets[currentIndex + 1];

    setUserStats((prev) => {
      const newCompleted = Array.from(new Set([...prev.completedPlanetIds, selectedPlanet.id]));
      const newCurrentPlanet = nextPlanet ? nextPlanet.id : selectedPlanet.id;

      return {
        ...prev,
        xp: prev.xp + xpGained,
        stardust: prev.stardust + stardustGained,
        stars: prev.stars + starsEarned,
        completedPlanetIds: newCompleted,
        currentPlanetId: newCurrentPlanet,
        planetProgress: {
          ...prev.planetProgress,
          [selectedPlanet.id]: 100,
          ...(nextPlanet ? { [nextPlanet.id]: 0 } : {}),
        },
      };
    });

    setVictoryDetails({
      planetTitle: selectedPlanet.title,
      stars: starsEarned,
      xp: xpGained,
      stardust: stardustGained,
    });

    setActiveModal('victory');
  };

  const handleToggleSound = () => {
    setUserStats((prev) => {
      const updated = !prev.soundEnabled;
      sounds.setMuted(!updated);
      if (updated) sounds.playClick();
      return { ...prev, soundEnabled: updated };
    });
  };

  const handleBuyAvatar = (avatarId: string, cost: number) => {
    setUserStats((prev) => ({
      ...prev,
      stardust: prev.stardust - cost,
      unlockedAvatars: [...prev.unlockedAvatars, avatarId],
      activeAvatarId: avatarId,
    }));
  };

  const handleEquipAvatar = (avatarId: string) => {
    setUserStats((prev) => ({
      ...prev,
      activeAvatarId: avatarId,
    }));
  };

  const handleBuyHat = (hatId: string, cost: number) => {
    setUserStats((prev) => ({
      ...prev,
      stardust: prev.stardust - cost,
      activeHatId: hatId,
    }));
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-purple-500 selection:text-white">
      {/* Dynamic Animated Starfield Canvas & Space Atmosphere */}
      <CosmicBackground />

      {/* Sticky Gamified Header */}
      <HeaderStats
        userStats={userStats}
        courses={COURSES}
        activeCourseId={activeCourseId}
        onSelectCourse={setActiveCourseId}
        onToggleSound={handleToggleSound}
        onOpenShop={() => setActiveModal('shop')}
        onOpenCodex={() => setActiveModal('codex')}
      />

      {/* Main Celestial Course Stages Map */}
      <main className="relative z-10 pb-20">
        <CourseMap
          course={activeCourse}
          userStats={userStats}
          onSelectPlanet={handleSelectPlanet}
        />
      </main>

      {/* MODALS */}
      {activeModal === 'lesson' && selectedPlanet && (
        <LessonModal
          planet={selectedPlanet}
          onClose={() => setActiveModal('none')}
          onFinishStage={handleFinishStage}
        />
      )}

      {activeModal === 'victory' && victoryDetails && (
        <VictoryModal
          planetTitle={victoryDetails.planetTitle}
          starsEarned={victoryDetails.stars}
          xpGained={victoryDetails.xp}
          stardustGained={victoryDetails.stardust}
          onContinue={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'shop' && (
        <SpaceShopModal
          userStats={userStats}
          onClose={() => setActiveModal('none')}
          onBuyAvatar={handleBuyAvatar}
          onEquipAvatar={handleEquipAvatar}
          onBuyHat={handleBuyHat}
          onEquipHat={() => {}}
        />
      )}

      {activeModal === 'codex' && (
        <CodexModal
          course={activeCourse}
          userStats={userStats}
          onClose={() => setActiveModal('none')}
        />
      )}
    </div>
  );
}
