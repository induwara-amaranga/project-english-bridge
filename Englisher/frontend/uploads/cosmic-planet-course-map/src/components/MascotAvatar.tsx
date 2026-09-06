import React from 'react';
import { motion } from 'motion/react';

interface MascotAvatarProps {
  avatarId?: string;
  hatId?: string;
  size?: 'sm' | 'md' | 'lg';
  isJumping?: boolean;
}

export const MascotAvatar: React.FC<MascotAvatarProps> = ({
  avatarId = 'zorblax',
  hatId,
  size = 'md',
  isJumping = false
}) => {
  const dimensions = {
    sm: { w: 48, h: 48, viewBox: '0 0 64 64' },
    md: { w: 64, h: 64, viewBox: '0 0 64 64' },
    lg: { w: 88, h: 88, viewBox: '0 0 64 64' },
  }[size];

  return (
    <motion.div
      animate={
        isJumping
          ? { y: [-15, 0, -10, 0], scale: [1, 1.15, 1, 1] }
          : { y: [0, -6, 0] }
      }
      transition={
        isJumping
          ? { duration: 0.6 }
          : { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }
      }
      className="relative inline-block drop-shadow-[0_0_12px_rgba(168,85,247,0.6)] z-20 cursor-pointer"
    >
      <svg
        width={dimensions.w}
        height={dimensions.h}
        viewBox={dimensions.viewBox}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients */}
          <radialGradient id="elephantBody" cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="60%" stopColor="#7E22CE" />
            <stop offset="100%" stopColor="#581C87" />
          </radialGradient>
          <radialGradient id="helmetGlass" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.9)" />
            <stop offset="40%" stopColor="rgba(192, 132, 252, 0.4)" />
            <stop offset="100%" stopColor="rgba(126, 34, 206, 0.1)" />
          </radialGradient>
          <linearGradient id="suitGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EDE9FE" />
            <stop offset="100%" stopColor="#DDD6FE" />
          </linearGradient>
          <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {avatarId === 'zorblax' ? (
          <g>
            {/* Space Suit Body */}
            <path
              d="M 22 42 C 22 36, 42 36, 42 42 L 44 54 C 44 58, 20 58, 20 54 Z"
              fill="url(#suitGradient)"
              stroke="#6B21A8"
              strokeWidth="1.5"
            />

            {/* Jetpack Thrusters */}
            <rect x="14" y="42" width="6" height="10" rx="3" fill="#94A3B8" />
            <rect x="44" y="42" width="6" height="10" rx="3" fill="#94A3B8" />
            {/* Thruster Flame */}
            <circle cx="17" cy="54" r="2.5" fill="#F59E0B" className="animate-ping" />
            <circle cx="47" cy="54" r="2.5" fill="#F59E0B" className="animate-ping" />

            {/* Suit Chest Emblem */}
            <circle cx="32" cy="46" r="3" fill="#8B5CF6" />
            <polygon points="32,44 33.5,47.5 30.5,47.5" fill="#FACC15" />

            {/* Big Cosmic Ears */}
            <ellipse cx="14" cy="24" rx="10" ry="8" fill="url(#elephantBody)" />
            <ellipse cx="14" cy="24" rx="6" ry="4" fill="#F472B6" opacity="0.8" />

            <ellipse cx="50" cy="24" rx="10" ry="8" fill="url(#elephantBody)" />
            <ellipse cx="50" cy="24" rx="6" ry="4" fill="#F472B6" opacity="0.8" />

            {/* Elephant Head */}
            <circle cx="32" cy="26" r="16" fill="url(#elephantBody)" />

            {/* Trunk */}
            <path
              d="M 32 28 Q 32 38, 38 36 Q 42 34, 38 31"
              fill="none"
              stroke="url(#elephantBody)"
              strokeWidth="5"
              strokeLinecap="round"
            />

            {/* Cute Big Eyes */}
            <circle cx="25" cy="22" r="3.5" fill="#FFFFFF" />
            <circle cx="26" cy="22" r="1.8" fill="#1E1B4B" />
            <circle cx="27" cy="21" r="0.8" fill="#FFFFFF" />

            <circle cx="39" cy="22" r="3.5" fill="#FFFFFF" />
            <circle cx="38" cy="22" r="1.8" fill="#1E1B4B" />
            <circle cx="39" cy="21" r="0.8" fill="#FFFFFF" />

            {/* Rosy Cheeks */}
            <ellipse cx="22" cy="27" rx="2.5" ry="1.5" fill="#F472B6" opacity="0.7" />
            <ellipse cx="42" cy="27" rx="2.5" ry="1.5" fill="#F472B6" opacity="0.7" />

            {/* Astronaut Bubble Helmet Bubble visor */}
            <circle
              cx="32"
              cy="26"
              r="19"
              fill="url(#helmetGlass)"
              stroke="#A855F7"
              strokeWidth="1.5"
              strokeOpacity="0.8"
            />
            {/* Visor Glint reflection */}
            <path
              d="M 22 14 A 16 16 0 0 1 38 12 A 16 16 0 0 0 20 22 Z"
              fill="#FFFFFF"
              opacity="0.5"
            />
          </g>
        ) : avatarId === 'astro_bunny' ? (
          <g>
            {/* Bunny Ears */}
            <path d="M 22 18 C 18 4, 22 -2, 26 12 Z" fill="#F472B6" />
            <path d="M 42 18 C 46 4, 42 -2, 38 12 Z" fill="#F472B6" />

            <circle cx="32" cy="28" r="15" fill="#F472B6" />
            <circle cx="26" cy="26" r="3" fill="#FFFFFF" />
            <circle cx="26" cy="26" r="1.5" fill="#000000" />
            <circle cx="38" cy="26" r="3" fill="#FFFFFF" />
            <circle cx="38" cy="26" r="1.5" fill="#000000" />
            <path d="M 30 30 Q 32 32, 34 30" stroke="#FFFFFF" strokeWidth="1.5" fill="none" />

            <circle cx="32" cy="28" r="19" fill="url(#helmetGlass)" stroke="#F472B6" strokeWidth="1.5" />
          </g>
        ) : (
          <g>
            {/* Nova Robot */}
            <rect x="20" y="16" width="24" height="20" rx="4" fill="#06B6D4" />
            <circle cx="26" cy="26" r="4" fill="#FACC15" />
            <circle cx="38" cy="26" r="4" fill="#FACC15" />
            <rect x="24" y="30" width="16" height="2" fill="#FFFFFF" />
            <circle cx="32" cy="28" r="19" fill="url(#helmetGlass)" stroke="#06B6D4" strokeWidth="1.5" />
          </g>
        )}

        {/* Optional Equipped Hat Overlay */}
        {hatId === 'hat_crown' && (
          <g transform="translate(20, -2)" filter="url(#goldGlow)">
            <polygon points="12,0 16,6 20,2 24,6 28,0 26,10 6,10" fill="#FACC15" stroke="#B45309" strokeWidth="1" />
            <circle cx="12" cy="1" r="1.5" fill="#EF4444" />
            <circle cx="20" cy="2" r="1.5" fill="#3B82F6" />
            <circle cx="28" cy="1" r="1.5" fill="#10B981" />
          </g>
        )}
        {hatId === 'hat_helmet' && (
          <path
            d="M 16 16 A 18 18 0 0 1 48 16 L 44 14 A 16 16 0 0 0 20 14 Z"
            fill="#F59E0B"
            stroke="#FACC15"
            strokeWidth="1.5"
          />
        )}
      </svg>

      {/* Pulsating shadow underneath mascot on planet */}
      <div className="w-8 h-2 bg-purple-900/60 rounded-full blur-xs mx-auto -mt-1" />
    </motion.div>
  );
};
