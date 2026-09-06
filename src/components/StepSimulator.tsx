import React, { useState, useEffect, useRef } from 'react';
import { Solution } from '../types.ts';
import { Play, Pause, RotateCcw, ChevronRight, ChevronLeft, CheckCircle2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StepSimulatorProps {
  solution: Solution;
  initialCards: Array<number | ''>;
  onClose?: () => void;
}

export const StepSimulator: React.FC<StepSimulatorProps> = ({
  solution,
  initialCards,
  onClose,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0); // 0 = initial state, 1 = after step 1, etc.
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  const totalSteps = solution.steps.length;

  // Compute card state at current step
  const getCardsAtStep = (stepIdx: number): number[] => {
    if (stepIdx === 0) {
      if (solution.steps[0]) {
        return [...solution.steps[0].cardsBefore];
      }
      return initialCards.filter((c): c is number => typeof c === 'number' && c > 0);
    }
    const step = solution.steps[stepIdx - 1];
    return step ? [...step.cardsAfter] : [];
  };

  const currentCards = getCardsAtStep(currentStepIndex);
  const currentStep = currentStepIndex > 0 ? solution.steps[currentStepIndex - 1] : null;

  // Auto playback
  useEffect(() => {
    if (isPlaying) {
      if (currentStepIndex >= totalSteps) {
        setIsPlaying(false);
        return;
      }
      playTimerRef.current = setTimeout(() => {
        setCurrentStepIndex((prev) => {
          const next = prev + 1;
          if (next >= totalSteps) {
            setIsPlaying(false);
          }
          return next;
        });
      }, 1600);
    } else {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    }
    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
  }, [isPlaying, currentStepIndex, totalSteps]);

  const handleNext = () => {
    if (currentStepIndex < totalSteps) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  const isCompleted = currentStepIndex === totalSteps;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 text-slate-800 shadow-lg space-y-3.5">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-slate-800">解法シミュレーター</h3>
            {solution.artistry && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                <Sparkles className="w-3 h-3 text-amber-500" />
                芸術度 {solution.artistry.grade} ({solution.artistry.score}点)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-mono mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="text-slate-800 font-semibold">{solution.expression} = {solution.target}</span>
            {solution.artistry?.tags.map((tag) => (
              <span key={tag} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-sans">
                {tag}
              </span>
            ))}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-bold">
            Step {currentStepIndex} / {totalSteps}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs bg-white hover:bg-slate-50 text-slate-700 px-2.5 py-1 rounded border border-slate-200 shadow-xs transition-colors"
            >
              閉じる
            </button>
          )}
        </div>
      </div>

      {/* Step formula banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center flex items-center justify-center min-h-[44px]">
        {currentStepIndex === 0 ? (
          <span className="text-xs text-slate-500 font-medium">
            初期カード状態
          </span>
        ) : currentStep ? (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg text-sm font-mono text-blue-700 font-bold">
            <span className="text-slate-500 text-xs">Step {currentStepIndex}:</span>
            <span className="text-slate-900">{currentStep.leftValue} {currentStep.operator} {currentStep.rightValue}</span>
            <span>=</span>
            <span className="text-blue-600 font-extrabold">{currentStep.result}</span>
          </div>
        ) : null}
      </div>

      {/* Cards Display Board */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 sm:p-6 min-h-[160px] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5">
          <AnimatePresence mode="popLayout">
            {currentCards.map((val, idx) => {
              const isNewlyCreated =
                currentStepIndex > 0 &&
                currentStep &&
                val === currentStep.result &&
                idx === currentCards.length - 1;

              const isTargetFinal = isCompleted && val === solution.target;

              return (
                <motion.div
                  key={`card-step-${currentStepIndex}-${idx}-${val}`}
                  initial={{ scale: 0.8, opacity: 0, y: -10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="flex flex-col items-center"
                >
                  {/* Simple number card */}
                  <div
                    className={`
                      select-none flex items-center justify-center
                      w-14 h-16 sm:w-16 sm:h-20
                      rounded-xl border-2 font-mono font-bold text-2xl sm:text-3xl
                      transition-all shadow-xs
                      ${
                        isTargetFinal
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-400/30 shadow-md'
                          : isNewlyCreated
                          ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-400/20 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                      }
                    `}
                  >
                    <span className="tabular-nums">{val}</span>
                  </div>

                  {isNewlyCreated && (
                    <span className="text-[10px] text-blue-700 font-bold mt-1 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                      合体後 ({currentStep?.operator})
                    </span>
                  )}
                  {isTargetFinal && (
                    <span className="text-[10px] text-emerald-700 font-bold mt-1 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      ✓ TARGET!
                    </span>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-xs font-semibold"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ターゲット「{solution.target}」の生成に成功しました！
          </motion.div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-xs bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs transition-colors font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            最初から
          </button>

          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className={`flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-lg font-semibold transition-all shadow-xs ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                一時停止
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                自動再生
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="flex items-center gap-1 text-xs bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs transition-colors font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            前へ
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentStepIndex === totalSteps}
            className="flex items-center gap-1 text-xs bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs transition-colors font-semibold"
          >
            次へ
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
