/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Solution } from './types.ts';
import { solveGameAllCardsOnly, evaluatePuzzleDifficulty } from './solver.ts';
import { ScreenshotUploader } from './components/ScreenshotUploader.tsx';
import { AllCardsSolutionsList } from './components/AllCardsSolutionsList.tsx';
import { RotateCcw } from 'lucide-react';

export default function App() {
  // Current recognized or configured puzzle values (empty initial state)
  const [target, setTarget] = useState<number | ''>('');
  const [cards, setCards] = useState<Array<number | ''>>(['', '', '', '', '']);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | undefined>(undefined);
  const [resetTrigger, setResetTrigger] = useState<number>(0);

  // Recognition state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate solutions that use all 5 cards
  const allCardSolutions = useMemo(() => {
    if (typeof target !== 'number' || target <= 0) {
      return [];
    }
    const validCards = cards.filter((c): c is number => typeof c === 'number' && c > 0);
    if (validCards.length < 5) {
      return [];
    }
    return solveGameAllCardsOnly(validCards, target);
  }, [cards, target]);

  // Handle OCR detection from ScreenshotUploader
  const handleDataDetected = (detectedTarget: number, detectedCards: number[], previewUrl?: string) => {
    setTarget(detectedTarget);
    setCards(detectedCards);
    setImagePreviewUrl(previewUrl);
    setError(null);
  };

  // Reset to empty state
  const handleReset = () => {
    setTarget('');
    setCards(['', '', '', '', '']);
    setImagePreviewUrl(undefined);
    setError(null);
    setResetTrigger((prev) => prev + 1);
  };

  // Update individual card value
  const handleCardChange = (index: number, valStr: string) => {
    const newCards = [...cards];
    if (valStr.trim() === '') {
      newCards[index] = '';
    } else {
      const val = parseInt(valStr, 10);
      newCards[index] = isNaN(val) ? '' : Math.max(1, Math.min(999, val));
    }
    setCards(newCards);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center font-bold text-sm text-white shadow-xs">
              Σ
            </div>
            <h1 className="font-bold text-base text-slate-900 tracking-tight">
              Card Calc Solver
            </h1>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 font-medium shadow-xs transition-colors"
            title="初期状態に戻す"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>リセット</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Input Panel (4 cols on lg) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Screenshot Upload */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
              <h2 className="font-bold text-sm text-slate-800 pb-2 border-b border-slate-100">
                スクリーンショット
              </h2>

              <ScreenshotUploader
                onDataDetected={handleDataDetected}
                isAnalyzing={isAnalyzing}
                setIsAnalyzing={setIsAnalyzing}
                error={error}
                setError={setError}
                resetTrigger={resetTrigger}
              />
            </div>

            {/* Target & Numbers Inputs */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
              <h2 className="font-bold text-sm text-slate-800 pb-2 border-b border-slate-100">
                TARGET & カード数値
              </h2>

              {/* TARGET value input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">TARGET (目標値)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    placeholder="例: 31"
                    value={target}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v.trim() === '') {
                        setTarget('');
                      } else {
                        const num = parseInt(v, 10);
                        setTarget(isNaN(num) ? '' : Math.max(1, num));
                      }
                    }}
                    className="w-full pl-3.5 pr-14 py-2 bg-slate-50 border border-slate-200 rounded-lg text-lg font-bold font-mono text-slate-900 placeholder:text-slate-300 placeholder:font-normal focus:outline-none focus:border-blue-500 focus:bg-white shadow-xs transition-colors"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <span className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                      TARGET
                    </span>
                  </div>
                </div>
              </div>

              {/* 5 Cards inputs */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">カード (5枚)</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {cards.map((val, idx) => (
                    <input
                      key={idx}
                      type="number"
                      min="1"
                      max="99"
                      placeholder={`#${idx + 1}`}
                      value={val}
                      onChange={(e) => handleCardChange(idx, e.target.value)}
                      className="w-full py-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold font-mono text-base text-slate-800 placeholder:text-slate-300 placeholder:font-normal focus:outline-none focus:border-blue-500 focus:bg-white shadow-xs transition-colors"
                    />
                  ))}
                </div>
              </div>

              {/* Status summary pill */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-500 font-mono">
                  [{cards.map((c) => (c === '' ? '-' : c)).join(', ')}]
                </span>
                <div className="flex items-center gap-1.5">
                  {typeof target === 'number' &&
                    target > 0 &&
                    cards.filter((c) => typeof c === 'number' && c > 0).length === 5 && (() => {
                      const diff = evaluatePuzzleDifficulty(allCardSolutions.length, true);
                      return diff ? (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${diff.badgeBg}`}
                          title={diff.description}
                        >
                          {diff.label}
                        </span>
                      ) : null;
                    })()}
                  <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                    {allCardSolutions.length} 通り
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Solutions List (8 cols on lg) */}
          <div className="lg:col-span-8">
            <AllCardsSolutionsList
              solutions={allCardSolutions}
              target={target}
              initialCards={cards}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
