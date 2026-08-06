export type PlanetStatus = 'completed' | 'in_progress' | 'locked';

export type PlanetType = 
  | 'terrestrial' 
  | 'gas_giant' 
  | 'ice_world' 
  | 'lava_planet' 
  | 'crystal_moon' 
  | 'nebula_core'
  | 'black_hole'
  | 'star_citadel';

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  xpReward: number;
  stardustReward: number;
}

export interface PlanetNodeData {
  id: string;
  number: number;
  title: string;
  category: string;
  description: string;
  lore: string;
  type: PlanetType;
  colorPrimary: string;
  colorSecondary: string;
  hasRings?: boolean;
  hasMoons?: boolean;
  moonCount?: number;
  lessons: Lesson[];
  prerequisiteId?: string;
  position: {
    x: number; // Percentage horizontal offset (e.g., 20% to 80%) for winding path
  };
}

export interface Sector {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  planets: PlanetNodeData[];
}

export interface Course {
  id: string;
  title: string;
  iconName: string;
  description: string;
  sectors: Sector[];
}

export interface ShopItem {
  id: string;
  name: string;
  category: 'avatar' | 'trail' | 'hat';
  cost: number;
  icon: string;
  description: string;
  previewColor?: string;
}

export interface UserStats {
  xp: number;
  level: number;
  stardust: number;
  stars: number;
  streakDays: number;
  currentPlanetId: string;
  completedPlanetIds: string[];
  planetProgress: Record<string, number>; // planetId -> percentage (0 to 100)
  unlockedAvatars: string[];
  activeAvatarId: string;
  activeHatId?: string;
  soundEnabled: boolean;
}
