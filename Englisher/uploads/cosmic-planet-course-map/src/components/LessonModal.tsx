import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlanetNodeData, QuizQuestion } from '../types';
import { X, Heart, Sparkles, CheckCircle2, XCircle, ShieldAlert, ArrowRight, Play, RotateCcw } from 'lucide-react';
import { sounds } from '../lib/sound';

interface LessonModalProps {
  planet: PlanetNodeData;
  onClose: () => void;
  onFinishStage: (starsEarned: number, xpGained: number, stardustGained: number) => void;
}

export const LessonModal: React.FC<LessonModalProps> = ({
  planet,
  onClose,
  onFinishStage,
}) => {
  const [gameState, setGameState] = useState<'overview' | 'playing' | 'result'>('overview');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [lives, setLives] = useState(3);
  const [correctCount, setCorrectCount] = useState(0);

  // Combine questions across all lessons on this planet
  const allQuestions: QuizQuestion[] = planet.lessons.flatMap((l) => l.questions);
  const currentQuestion = allQuestions[currentQuestionIndex] || allQuestions[0];

  const handleStartMission = () => {
    sounds.playClick();
    setGameState('playing');
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setLives(3);
    setCorrectCount(0);
  };

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    sounds.playClick();
    setSelectedOption(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || isAnswered) return;
    setIsAnswered(true);

    const isCorrect = selectedOption === currentQuestion.correctIndex;
    if (isCorrect) {
      sounds.playCorrect();
      setCorrectCount((prev) => prev + 1);
    } else {
      sounds.playIncorrect();
      setLives((prev) => Math.max(0, prev - 1));
    }
  };

  const handleNextQuestion = () => {
    sounds.playClick();
    if (currentQuestionIndex < allQuestions.length - 1 && lives > 0) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      // Finished all questions or out of lives!
      const starsEarned = lives === 3 ? 3 : lives === 2 ? 2 : correctCount > 0 ? 1 : 0;
      const totalXp = correctCount * 50 + starsEarned * 30;
      const totalStardust = correctCount * 10 + starsEarned * 5;
      onFinishStage(starsEarned, totalXp, totalStardust);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-xl bg-slate-900 border border-purple-500/30 rounded-3xl shadow-2xl overflow-hidden"
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

        {/* OVERVIEW SCREEN */}
        {gameState === 'overview' && (
          <div className="p-6 sm:p-8 flex flex-col items-center text-center">
            {/* Planet Header Icon Glow */}
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center shadow-xl border-2 mb-4 relative"
              style={{
                backgroundColor: planet.colorPrimary,
                borderColor: planet.colorSecondary,
              }}
            >
              <span className="text-3xl font-black text-white">{planet.number}</span>
              <Sparkles className="w-5 h-5 text-yellow-300 absolute -top-1 -right-1 animate-pulse" />
            </div>

            <span className="text-xs font-bold tracking-widest text-purple-400 uppercase">
              {planet.category}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              {planet.title}
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/80 italic mt-2 max-w-md">
              "{planet.lore}"
            </p>

            {/* Stage Objectives */}
            <div className="w-full bg-slate-950/60 rounded-2xl p-4 border border-slate-800 my-6 text-left">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Mission Objectives
              </h4>
              <ul className="space-y-2 text-sm text-slate-200">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Complete {allQuestions.length} Space Telemetry Questions</span>
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-400 shrink-0" />
                  <span>Earn up to +150 XP & +25 Stardust 💎</span>
                </li>
              </ul>
            </div>

            <button
              onClick={handleStartMission}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-base tracking-wide shadow-lg shadow-purple-600/40 flex items-center justify-center gap-2 transition transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>LAUNCH PLANETARY MISSION</span>
            </button>
          </div>
        )}

        {/* PLAYING QUIZ SCREEN */}
        {gameState === 'playing' && (
          <div className="p-6 sm:p-8">
            {/* Header Status Bar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map((h) => (
                  <Heart
                    key={h}
                    className={`w-5 h-5 transition-all ${
                      h <= lives
                        ? 'text-red-500 fill-red-500 scale-100'
                        : 'text-slate-700 fill-slate-800 scale-90'
                    }`}
                  />
                ))}
              </div>

              <div className="text-xs font-bold text-purple-300 bg-purple-950/80 px-3 py-1 rounded-full border border-purple-500/30">
                Question {currentQuestionIndex + 1} / {allQuestions.length}
              </div>
            </div>

            {/* Question Card */}
            <div className="mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">
                {currentQuestion.prompt}
              </h3>
            </div>

            {/* Multiple Choice Options */}
            <div className="space-y-3 mb-6">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === currentQuestion.correctIndex;

                let buttonStyle =
                  'bg-slate-950/80 border-slate-800 hover:border-purple-500 text-slate-200';
                if (isSelected) {
                  buttonStyle =
                    'bg-purple-900/60 border-purple-400 text-white ring-2 ring-purple-400/50';
                }
                if (isAnswered) {
                  if (isCorrect) {
                    buttonStyle =
                      'bg-emerald-950/80 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/50';
                  } else if (isSelected) {
                    buttonStyle =
                      'bg-red-950/80 border-red-500 text-red-200 ring-2 ring-red-500/50';
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    disabled={isAnswered}
                    className={`w-full p-4 rounded-2xl border text-left font-semibold text-sm sm:text-base flex items-center justify-between transition-all cursor-pointer ${buttonStyle}`}
                  >
                    <span>{option}</span>
                    {isAnswered && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    )}
                    {isAnswered && isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation Box after Answer */}
            <AnimatePresence>
              {isAnswered && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className={`p-4 rounded-2xl border mb-6 text-xs sm:text-sm ${
                    selectedOption === currentQuestion.correctIndex
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-red-950/40 border-red-500/40 text-red-300'
                  }`}
                >
                  <p className="font-bold mb-1">
                    {selectedOption === currentQuestion.correctIndex
                      ? '✨ Stellar Transmission Correct!'
                      : '⚠️ Telemetry Anomaly Detected:'}
                  </p>
                  <p>{currentQuestion.explanation}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Controls */}
            {!isAnswered ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={selectedOption === null}
                className={`w-full py-3.5 rounded-2xl font-extrabold text-sm tracking-wide transition ${
                  selectedOption !== null
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/40 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                CHECK TRANSMISSION
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm tracking-wide shadow-lg shadow-emerald-600/40 flex items-center justify-center gap-2 cursor-pointer transition"
              >
                <span>CONTINUE MISSION</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
