/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Solution } from './types.ts';
import { solveGameAllCardsOnly, evaluatePuzzleDifficulty } from './solver.ts';
import { ScreenshotUploader } from './components/ScreenshotUploader.tsx';
import { AllCardsSolutionsList } from './components/AllCardsSolutionsList.tsx';
import { RotateCcw, HelpCircle, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Helper to parse target and cards from URL query parameters
function parseUrlParams(): { target: number | ''; cards: Array<number | ''> } {
  if (typeof window === 'undefined') {
    return { target: '', cards: ['', '', '', '', ''] };
  }
  try {
    const params = new URLSearchParams(window.location.search);
    // target or t
    const targetParam = params.get('target') ?? params.get('t');
    let parsedTarget: number | '' = '';
    if (targetParam) {
      const parsed = parseInt(targetParam.trim(), 10);
      if (!isNaN(parsed) && parsed > 0) {
        parsedTarget = Math.max(1, Math.min(9999, parsed));
      }
    }

    // cards or c (supports comma, hyphen, space, slash delimiters)
    const cardsParam = params.get('cards') ?? params.get('c');
    const parsedCards: Array<number | ''> = ['', '', '', '', ''];

    if (cardsParam) {
      const parts = cardsParam.split(/[,_\-\s/]+/).filter(Boolean);
      for (let i = 0; i < 5; i++) {
        if (i < parts.length) {
          const num = parseInt(parts[i].trim(), 10);
          if (!isNaN(num) && num > 0) {
            parsedCards[i] = Math.max(1, Math.min(99, num));
          }
        }
      }
    } else {
      // Individual params: c1..c5 or card1..card5
      for (let i = 0; i < 5; i++) {
        const val = params.get(`c${i + 1}`) ?? params.get(`card${i + 1}`);
        if (val) {
          const num = parseInt(val.trim(), 10);
          if (!isNaN(num) && num > 0) {
            parsedCards[i] = Math.max(1, Math.min(99, num));
          }
        }
      }
    }

    return { target: parsedTarget, cards: parsedCards };
  } catch {
    return { target: '', cards: ['', '', '', '', ''] };
  }
}

export default function App() {
  // Parse initial values from URL query parameters if present
  const initialParams = useMemo(() => parseUrlParams(), []);

  // Current recognized or configured puzzle values
  const [target, setTarget] = useState<number | ''>(() => initialParams.target);
  const [cards, setCards] = useState<Array<number | ''>>(() => initialParams.cards);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | undefined>(undefined);
  const [resetTrigger, setResetTrigger] = useState<number>(0);

  // Sync state back to URL query parameters
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);

      // Target param
      if (typeof target === 'number' && target > 0) {
        url.searchParams.set('target', String(target));
        url.searchParams.delete('t');
      } else {
        url.searchParams.delete('target');
        url.searchParams.delete('t');
      }

      // Cards param
      const hasAnyCard = cards.some((c) => typeof c === 'number' && c > 0);
      if (hasAnyCard) {
        // Form comma-separated values (e.g. 6,1,1,4,5)
        url.searchParams.set('cards', cards.map((c) => (c === '' ? '' : String(c))).join(','));
        url.searchParams.delete('c');
        for (let i = 1; i <= 5; i++) {
          url.searchParams.delete(`c${i}`);
          url.searchParams.delete(`card${i}`);
        }
      } else {
        url.searchParams.delete('cards');
        url.searchParams.delete('c');
        for (let i = 1; i <= 5; i++) {
          url.searchParams.delete(`c${i}`);
          url.searchParams.delete(`card${i}`);
        }
      }

      const newRelativePathQuery = url.pathname + (url.search ? url.search : '');
      window.history.replaceState(null, '', newRelativePathQuery);
    } catch {
      // Ignore URL history errors if any
    }
  }, [target, cards]);

  // Handle browser forward/back navigation
  useEffect(() => {
    const handlePopState = () => {
      const { target: urlTarget, cards: urlCards } = parseUrlParams();
      setTarget(urlTarget);
      setCards(urlCards);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Recognition state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDifficultyHelp, setShowDifficultyHelp] = useState(false);

  // Ref to the "TARGET & カード数値" container for scrolling
  const targetCardsRef = useRef<HTMLDivElement>(null);

  // Scroll to "TARGET & カード数値" so it sits right at the top
  const scrollToTargetCardsSection = (behavior: ScrollBehavior = 'smooth') => {
    if (typeof window === 'undefined') return;
    const el = targetCardsRef.current || document.getElementById('target-cards-section');
    if (!el) return;
    const headerOffset = 64; // 48px sticky header + 16px comfort margin
    const elementPosition = el.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
    window.scrollTo({
      top: Math.max(0, offsetPosition),
      behavior,
    });
  };

  // Scroll into view when opened with URL query parameters
  useEffect(() => {
    const hasUrlTarget = initialParams.target !== '';
    const hasUrlCards = initialParams.cards.some((c) => c !== '');
    if (hasUrlTarget || hasUrlCards) {
      const timer = setTimeout(() => {
        scrollToTargetCardsSection('smooth');
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [initialParams]);

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

    // Scroll to "TARGET & カード数値" section so it appears at the top
    setTimeout(() => {
      scrollToTargetCardsSection('smooth');
    }, 100);
  };

  // Reset to empty state
  const handleReset = () => {
    setTarget('');
    setCards(['', '', '', '', '']);
    setImagePreviewUrl(undefined);
    setError(null);
    setResetTrigger((prev) => prev + 1);
  };

  // Helper to normalize input string (converts full-width digits to half-width, strips non-digits)
  const normalizeNumericInput = (valStr: string): string => {
    // Convert full-width numbers （０-９） to half-width (0-9)
    const halfWidth = valStr.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));
    // Keep only digits
    return halfWidth.replace(/[^0-9]/g, '');
  };

  // Update target value
  const handleTargetChange = (valStr: string) => {
    const clean = normalizeNumericInput(valStr);
    if (clean === '') {
      setTarget('');
    } else {
      const num = parseInt(clean, 10);
      setTarget(isNaN(num) ? '' : Math.max(1, Math.min(9999, num)));
    }
  };

  // Update individual card value
  const handleCardChange = (index: number, valStr: string) => {
    const clean = normalizeNumericInput(valStr);
    const newCards = [...cards];
    if (clean === '') {
      newCards[index] = '';
    } else {
      const val = parseInt(clean, 10);
      newCards[index] = isNaN(val) ? '' : Math.max(1, Math.min(99, val));
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
            <div
              ref={targetCardsRef}
              id="target-cards-section"
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4 scroll-mt-16"
            >
              <h2 className="font-bold text-sm text-slate-800 pb-2 border-b border-slate-100">
                TARGET & カード数値
              </h2>

              {/* TARGET value input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="target-input" className="text-xs font-semibold text-slate-600 block cursor-pointer">
                    TARGET (目標値)
                  </label>
                  {target !== '' && (
                    <button
                      type="button"
                      onClick={() => setTarget('')}
                      className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      クリア
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="target-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    placeholder="例: 31"
                    value={target}
                    onChange={(e) => handleTargetChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        document.getElementById('card-input-0')?.focus();
                      }
                    }}
                    className="w-full pl-3.5 pr-20 py-2 bg-white border border-slate-300 rounded-lg text-lg font-bold font-mono text-slate-900 placeholder:text-slate-300 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs transition-all cursor-text"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <span className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                      TARGET
                    </span>
                  </div>
                </div>
              </div>

              {/* 5 Cards inputs */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="card-input-0" className="text-xs font-semibold text-slate-600 cursor-pointer">
                    カード (5枚)
                  </label>
                  {cards.some((c) => c !== '') && (
                    <button
                      type="button"
                      onClick={() => setCards(['', '', '', '', ''])}
                      className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      クリア
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {cards.map((val, idx) => (
                    <input
                      key={idx}
                      id={`card-input-${idx}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      placeholder={`#${idx + 1}`}
                      value={val}
                      onChange={(e) => {
                        handleCardChange(idx, e.target.value);
                        // Auto-advance to next card if input has 1 digit and value is 2-9, or 2 digits
                        const cleaned = normalizeNumericInput(e.target.value);
                        if (cleaned.length >= 2 || (cleaned.length === 1 && parseInt(cleaned, 10) >= 2)) {
                          if (idx < 4) {
                            setTimeout(() => {
                              document.getElementById(`card-input-${idx + 1}`)?.focus();
                            }, 50);
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowRight' || e.key === 'Enter') {
                          if (idx < 4) {
                            e.preventDefault();
                            document.getElementById(`card-input-${idx + 1}`)?.focus();
                          }
                        } else if (e.key === 'ArrowLeft' || (e.key === 'Backspace' && cards[idx] === '')) {
                          if (idx > 0) {
                            document.getElementById(`card-input-${idx - 1}`)?.focus();
                          }
                        }
                      }}
                      className="w-full py-2 bg-white border border-slate-300 rounded-lg text-center font-bold font-mono text-base text-slate-900 placeholder:text-slate-300 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs transition-all cursor-text"
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
                        <button
                          type="button"
                          onClick={() => setShowDifficultyHelp((prev) => !prev)}
                          className={`px-1.5 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all hover:ring-2 hover:ring-indigo-300 active:scale-95 ${diff.badgeBg}`}
                          title="タップして難易度の判定基準を表示"
                        >
                          <span>{diff.label}</span>
                          <HelpCircle className="w-3 h-3 opacity-70" />
                        </button>
                      ) : null;
                    })()}
                  <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                    {allCardSolutions.length} 通り
                  </span>
                </div>
              </div>

              {/* Problem Difficulty Criteria Collapsible Tips Box */}
              <AnimatePresence>
                {showDifficultyHelp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden pt-1"
                  >
                    <div className="bg-indigo-50/80 border border-indigo-200 rounded-lg p-3 text-xs text-indigo-950 space-y-2">
                      <div className="flex items-center justify-between font-bold text-indigo-900 border-b border-indigo-200/60 pb-1.5">
                        <span className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                          <Flame className="w-3.5 h-3.5 text-indigo-600" />
                          問題難易度の判定基準（解答数に基づく）
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowDifficultyHelp(false)}
                          className="text-indigo-700 hover:text-indigo-950 font-bold px-1.5 py-0.5 rounded bg-indigo-100/80 hover:bg-indigo-200 transition-colors text-[10px]"
                        >
                          閉じる
                        </button>
                      </div>
                      <p className="text-[11px] text-indigo-900/90 leading-relaxed">
                        解法パターン数が少ない問題ほど、限られた唯一無二の計算ルートを見抜くひらめきが必要となるため、<strong>1通りの問題が最も難易度が高く（最難関）</strong>なります。
                      </p>
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <div className="bg-white/90 rounded-lg p-1.5 border border-rose-200 shadow-2xs">
                          <div className="font-bold text-rose-900 flex items-center justify-between text-[11px]">
                            <span>最難関 ★★★★★</span>
                            <span className="text-rose-700 font-mono font-bold text-[10px] bg-rose-100 px-1 py-0.2 rounded">1通り</span>
                          </div>
                          <p className="text-slate-600 text-[10px] mt-0.5 leading-snug">
                            正解がたった1つしかない超難問。
                          </p>
                        </div>
                        <div className="bg-white/90 rounded-lg p-1.5 border border-orange-200 shadow-2xs">
                          <div className="font-bold text-orange-900 flex items-center justify-between text-[11px]">
                            <span>難問 ★★★★☆</span>
                            <span className="text-orange-700 font-mono font-bold text-[10px] bg-orange-100 px-1 py-0.2 rounded">2〜3通り</span>
                          </div>
                          <p className="text-slate-600 text-[10px] mt-0.5 leading-snug">
                            解法がごくわずかの高難度問題。
                          </p>
                        </div>
                        <div className="bg-white/90 rounded-lg p-1.5 border border-amber-200 shadow-2xs">
                          <div className="font-bold text-amber-900 flex items-center justify-between text-[11px]">
                            <span>上級 ★★★☆☆</span>
                            <span className="text-amber-700 font-mono font-bold text-[10px] bg-amber-100 px-1 py-0.2 rounded">4〜10通り</span>
                          </div>
                          <p className="text-slate-600 text-[10px] mt-0.5 leading-snug">
                            解法が限られ適度な試行錯誤が必要。
                          </p>
                        </div>
                        <div className="bg-white/90 rounded-lg p-1.5 border border-blue-200 shadow-2xs">
                          <div className="font-bold text-blue-900 flex items-center justify-between text-[11px]">
                            <span>中級 ★★☆☆☆</span>
                            <span className="text-blue-700 font-mono font-bold text-[10px] bg-blue-100 px-1 py-0.2 rounded">11〜30通り</span>
                          </div>
                          <p className="text-slate-600 text-[10px] mt-0.5 leading-snug">
                            複数の解法がある標準的難易度。
                          </p>
                        </div>
                        <div className="bg-white/90 rounded-lg p-1.5 border border-emerald-200 shadow-2xs">
                          <div className="font-bold text-emerald-900 flex items-center justify-between text-[11px]">
                            <span>初級 ★☆☆☆☆</span>
                            <span className="text-emerald-700 font-mono font-bold text-[10px] bg-emerald-100 px-1 py-0.2 rounded">31通り〜</span>
                          </div>
                          <p className="text-slate-600 text-[10px] mt-0.5 leading-snug">
                            解法が豊富で解きやすい問題。
                          </p>
                        </div>
                        <div className="bg-white/90 rounded-lg p-1.5 border border-slate-200 shadow-2xs">
                          <div className="font-bold text-slate-700 flex items-center justify-between text-[11px]">
                            <span>解なし</span>
                            <span className="text-slate-600 font-mono font-bold text-[10px] bg-slate-100 px-1 py-0.2 rounded">0通り</span>
                          </div>
                          <p className="text-slate-600 text-[10px] mt-0.5 leading-snug">
                            5枚全て使う解法が存在しない問題。
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
