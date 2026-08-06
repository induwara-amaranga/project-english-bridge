import React from 'react';
import { motion } from 'motion/react';
import { UserStats, ShopItem } from '../types';
import { AVATARS, SHOP_ITEMS } from '../data/courses';
import { MascotAvatar } from './MascotAvatar';
import { X, Sparkles, Check, Crown, Shield } from 'lucide-react';
import { sounds } from '../lib/sound';

interface SpaceShopModalProps {
  userStats: UserStats;
  onClose: () => void;
  onBuyAvatar: (avatarId: string, cost: number) => void;
  onEquipAvatar: (avatarId: string) => void;
  onBuyHat: (hatId: string, cost: number) => void;
  onEquipHat: (hatId: string) => void;
}

export const SpaceShopModal: React.FC<SpaceShopModalProps> = ({
  userStats,
  onClose,
  onBuyAvatar,
  onEquipAvatar,
  onBuyHat,
  onEquipHat,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-2xl bg-slate-900 border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Modal Close Button */}
        <button
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 z-20 p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-full transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-pink-400" />
              Cosmic Explorer Shop
            </h2>
            <p className="text-xs text-slate-400">
              Customize your astronaut mascot with Stardust!
            </p>
          </div>

          <div className="flex items-center gap-2 bg-pink-950/60 border border-pink-500/30 px-3 py-1.5 rounded-xl">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span className="text-sm font-black text-pink-200">
              {userStats.stardust} 💎
            </span>
          </div>
        </div>

        <div className="overflow-y-auto space-y-6 pr-1 custom-scrollbar">
          {/* Section 1: Astronaut Avatars */}
          <div>
            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3">
              Cosmic Avatars
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AVATARS.map((av) => {
                const isUnlocked = userStats.unlockedAvatars.includes(av.id);
                const isActive = userStats.activeAvatarId === av.id;

                return (
                  <div
                    key={av.id}
                    className={`p-4 rounded-2xl border flex items-center gap-4 transition ${
                      isActive
                        ? 'bg-purple-950/60 border-purple-400 ring-2 ring-purple-400/40'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="shrink-0 bg-slate-900 p-2 rounded-2xl border border-slate-800">
                      <MascotAvatar avatarId={av.id} hatId={userStats.activeHatId} size="sm" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-white truncate">{av.name}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{av.description}</p>

                      <div className="mt-2">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                            <Check className="w-3.5 h-3.5" /> Equipped
                          </span>
                        ) : isUnlocked ? (
                          <button
                            onClick={() => {
                              sounds.playClick();
                              onEquipAvatar(av.id);
                            }}
                            className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer"
                          >
                            Equip
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (userStats.stardust >= av.cost) {
                                sounds.playUnlock();
                                onBuyAvatar(av.id, av.cost);
                              } else {
                                sounds.playIncorrect();
                              }
                            }}
                            disabled={userStats.stardust < av.cost}
                            className={`px-3 py-1 rounded-lg font-bold text-xs transition flex items-center gap-1 ${
                              userStats.stardust >= av.cost
                                ? 'bg-pink-600 hover:bg-pink-500 text-white cursor-pointer'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <span>Unlock ({av.cost} 💎)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Space Accessories */}
          <div>
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">
              Cosmic Accessories
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SHOP_ITEMS.map((item) => {
                const isEquipped = userStats.activeHatId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border flex items-center gap-4 transition ${
                      isEquipped
                        ? 'bg-amber-950/60 border-amber-400 ring-2 ring-amber-400/40'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                      {item.icon === 'Crown' ? (
                        <Crown className="w-6 h-6 text-yellow-400" />
                      ) : (
                        <Shield className="w-6 h-6 text-amber-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-white truncate">{item.name}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{item.description}</p>

                      <div className="mt-2">
                        {isEquipped ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                            <Check className="w-3.5 h-3.5" /> Equipped
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              if (userStats.stardust >= item.cost) {
                                sounds.playUnlock();
                                onBuyHat(item.id, item.cost);
                              } else {
                                sounds.playIncorrect();
                              }
                            }}
                            disabled={userStats.stardust < item.cost}
                            className={`px-3 py-1 rounded-lg font-bold text-xs transition flex items-center gap-1 ${
                              userStats.stardust >= item.cost
                                ? 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <span>Equip ({item.cost} 💎)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
