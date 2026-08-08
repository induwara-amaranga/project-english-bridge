import React from 'react';
import { motion } from 'motion/react';
import { Check, Lock, Star, Sparkles } from 'lucide-react';
import { PlanetNodeData, PlanetStatus } from '../types';
import { MascotAvatar } from './MascotAvatar';
import { sounds } from '../lib/sound';

interface PlanetNodeProps {
  planet: PlanetNodeData;
  status: PlanetStatus;
  progressPercent: number; // 0 to 100
  isActiveCurrent: boolean;
  activeAvatarId?: string;
  activeHatId?: string;
  onSelect: (planet: PlanetNodeData) => void;
}

export const PlanetNode: React.FC<PlanetNodeProps> = ({
  planet,
  status,
  progressPercent,
  isActiveCurrent,
  activeAvatarId,
  activeHatId,
  onSelect,
}) => {
  const isLocked = status === 'locked';
  const isCompleted = status === 'completed';

  const handleClick = () => {
    if (isLocked) {
      sounds.playIncorrect();
      return;
    }
    sounds.playPlanetSelect();
    onSelect(planet);
  };

  return (
    <div className="relative flex flex-col items-center group cursor-pointer my-12">
      {/* Active Mascot perched on top of planet if this is the active stage */}
      {isActiveCurrent && (
        <div className="absolute -top-14 z-30 transition-transform duration-300 group-hover:scale-110">
          <MascotAvatar
            avatarId={activeAvatarId}
            hatId={activeHatId}
            size="md"
            isJumping={false}
          />
        </div>
      )}

      {/* Atmospheric Outer Glow Effect */}
      <motion.div
        animate={
          isActiveCurrent
            ? { scale: [1, 1.08, 1], opacity: [0.6, 0.9, 0.6] }
            : isCompleted
            ? { scale: [1, 1.04, 1], opacity: [0.4, 0.7, 0.4] }
            : { opacity: 0.2 }
        }
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute w-36 h-36 rounded-full blur-xl pointer-events-none -mt-3"
        style={{
          backgroundColor: isLocked
            ? '#334155'
            : isCompleted
            ? '#10B981'
            : planet.colorPrimary,
        }}
      />

      {/* Main Planet Sphere & Ring Structure */}
      <motion.div
        whileHover={!isLocked ? { scale: 1.1, rotate: 2 } : { scale: 0.98 }}
        whileTap={!isLocked ? { scale: 0.95 } : {}}
        onClick={handleClick}
        className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center transition-shadow duration-300 z-10 ${
          isLocked ? 'opacity-60 grayscale-[0.6]' : 'opacity-100'
        }`}
      >
        {/* SVG Rendered 3D Planet Surface */}
        <svg
          viewBox="0 0 120 120"
          className="w-full h-full overflow-visible drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
        >
          <defs>
            {/* Planet Body Radial Gradient */}
            <radialGradient
              id={`planetGrad_${planet.id}`}
              cx="35%"
              cy="30%"
              r="70%"
            >
              <stop
                offset="0%"
                stopColor={isLocked ? '#475569' : planet.colorPrimary}
              />
              <stop
                offset="70%"
                stopColor={isLocked ? '#1E293B' : planet.colorSecondary}
              />
              <stop offset="100%" stopColor="#0F172A" />
            </radialGradient>

            {/* Planet Atmosphere Highlight */}
            <radialGradient
              id={`atmosHighlight_${planet.id}`}
              cx="30%"
              cy="25%"
              r="50%"
            >
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>

            {/* Ring Gradient */}
            <linearGradient id={`ringGrad_${planet.id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={planet.colorPrimary} stopOpacity="0.8" />
              <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="100%" stopColor={planet.colorSecondary} stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Back half of Planet Rings (if ringed) */}
          {planet.hasRings && (
            <ellipse
              cx="60"
              cy="60"
              rx="68"
              ry="22"
              fill="none"
              stroke={`url(#ringGrad_${planet.id})`}
              strokeWidth="7"
              transform="rotate(-20 60 60)"
              opacity="0.85"
            />
          )}

          {/* Orbiting Moon (if hasMoons) */}
          {planet.hasMoons && !isLocked && (
            <g className="animate-[spin_12s_linear_infinite] origin-[60px_60px]">
              <circle
                cx="15"
                cy="25"
                r="6"
                fill="#E2E8F0"
                stroke="#94A3B8"
                strokeWidth="1"
              />
              <circle cx="14" cy="24" r="1.5" fill="#CBD5E1" />
            </g>
          )}

          {/* Main Planet Sphere */}
          <circle
            cx="60"
            cy="60"
            r="46"
            fill={`url(#planetGrad_${planet.id})`}
            stroke={
              isActiveCurrent
                ? '#FFFFFF'
                : isCompleted
                ? '#34D399'
                : 'rgba(255,255,255,0.2)'
            }
            strokeWidth={isActiveCurrent ? '3' : '1.5'}
          />

          {/* Surface Details (Craters / Swirls depending on planet type) */}
          {planet.type === 'gas_giant' && (
            <g opacity="0.4">
              <path
                d="M 20 50 Q 60 65, 100 50 Q 60 42, 20 50 Z"
                fill="#FFFFFF"
              />
              <path
                d="M 18 68 Q 60 80, 102 68 Q 60 60, 18 68 Z"
                fill="#FFFFFF"
              />
            </g>
          )}

          {planet.type === 'terrestrial' && (
            <g opacity="0.3">
              <circle cx="45" cy="40" r="10" fill="#047857" />
              <path
                d="M 65 55 C 80 50, 90 70, 70 80 C 55 85, 60 65, 65 55 Z"
                fill="#047857"
              />
            </g>
          )}

          {planet.type === 'ice_world' && (
            <g opacity="0.3" stroke="#FFFFFF" strokeWidth="1">
              <line x1="30" y1="35" x2="55" y2="75" />
              <line x1="60" y1="25" x2="85" y2="65" />
            </g>
          )}

          {/* Glossy Reflection Arc */}
          <circle
            cx="60"
            cy="60"
            r="46"
            fill={`url(#atmosHighlight_${planet.id})`}
          />

          {/* Front half of Planet Rings */}
          {planet.hasRings && (
            <ellipse
              cx="60"
              cy="60"
              rx="68"
              ry="22"
              fill="none"
              stroke={`url(#ringGrad_${planet.id})`}
              strokeWidth="7"
              strokeDasharray="120 120"
              strokeDashoffset="-30"
              transform="rotate(-20 60 60)"
            />
          )}

          {/* Number / Lock Icon in Planet Center */}
          <g>
            {isLocked ? (
              <g transform="translate(46, 46)">
                <circle cx="14" cy="14" r="14" fill="rgba(15, 23, 42, 0.75)" />
                <Lock x="6" y="6" width="16" height="16" className="text-slate-400" />
              </g>
            ) : isCompleted ? (
              <g transform="translate(42, 42)">
                <circle cx="18" cy="18" r="18" fill="#10B981" />
                <Check x="7" y="7" width="22" height="22" className="text-white stroke-[3]" />
              </g>
            ) : (
              <text
                x="60"
                y="68"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="26"
                fontWeight="800"
                fontFamily="sans-serif"
                style={{
                  filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.8))',
                }}
              >
                {planet.number}
              </text>
            )}
          </g>
        </svg>

        {/* Top Floating Badge for Completed Status (matches reference image green check circle!) */}
        {isCompleted && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white rounded-full p-1.5 shadow-lg shadow-emerald-500/50 border-2 border-slate-900 z-20">
            <Check className="w-5 h-5 stroke-[3]" />
          </div>
        )}

        {/* Progress Ring for In-Progress planet */}
        {!isCompleted && !isLocked && progressPercent > 0 && (
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
            <circle
              cx="50%"
              cy="50%"
              r="48%"
              fill="none"
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth="4"
            />
            <circle
              cx="50%"
              cy="50%"
              r="48%"
              fill="none"
              stroke="#A855F7"
              strokeWidth="4"
              strokeDasharray="290"
              strokeDashoffset={290 - (290 * progressPercent) / 100}
              strokeLinecap="round"
            />
          </svg>
        )}
      </motion.div>

      {/* Planet Label Info (Title & Status) */}
      <div className="mt-3 text-center max-w-[160px] z-10">
        <h4 className="font-bold text-sm sm:text-base text-white tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] flex items-center justify-center gap-1">
          {planet.title}
          {isCompleted && <Sparkles className="w-3.5 h-3.5 text-yellow-400" />}
        </h4>
        <p className="text-xs font-semibold mt-0.5 tracking-wider">
          {isCompleted ? (
            <span className="text-emerald-400 font-bold drop-shadow">Completed</span>
          ) : isLocked ? (
            <span className="text-slate-400">Locked</span>
          ) : progressPercent > 0 ? (
            <span className="text-purple-300 font-bold">{progressPercent}%</span>
          ) : (
            <span className="text-purple-400">Ready to Explore</span>
          )}
        </p>
      </div>
    </div>
  );
};
