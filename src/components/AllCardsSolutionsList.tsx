import React, { useState, useMemo } from 'react';
import { Solution, SolutionVariant } from '../types.ts';
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  Info,
  Flame,
  Shuffle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AllCardsSolutionsListProps {
  solutions: Solution[];
  target: number | '';
  initialCards: Array<number | ''>;
}

export const AllCardsSolutionsList: React.FC<AllCardsSolutionsListProps> = ({
  solutions,
  target,
  initialCards,
}) => {
  const [showArtistryCriteria, setShowArtistryCriteria] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [expandedVariantIds, setExpandedVariantIds] = useState<Set<string>>(new Set());

  // Check if inputs are fully configured
  const isInputConfigured =
    typeof target === 'number' &&
    target > 0 &&
    initialCards.filter((c): c is number => typeof c === 'number' && c > 0).length === 5;

  // Toggle accordion for steps
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle accordion for variants
  const toggleVariantExpand = (id: string) => {
    setExpandedVariantIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Sort solutions fixed by artistry score in descending order (highest artistry first)
  const displaySolutions = useMemo(() => {
    return [...solutions].sort((a, b) => {
      const scoreA = a.artistry?.score ?? 0;
      const scoreB = b.artistry?.score ?? 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.expression.localeCompare(b.expression);
    });
  }, [solutions]);

  // Helper for grade badge styling
  const getGradeBadge = (art?: Solution['artistry']) => {
    if (!art) return null;
    const { grade, score } = art;
    switch (grade) {
      case 'S':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 ring-1 ring-amber-200/60">
            <Sparkles className="w-3 h-3 text-amber-500" />
            芸術度 S ({score}点)
          </span>
        );
      case 'A':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
            <Flame className="w-3 h-3 text-purple-600" />
            芸術度 A ({score}点)
          </span>
        );
      case 'B':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
            芸術度 B ({score}点)
          </span>
        );
      case 'C':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            芸術度 C ({score}点)
          </span>
        );
      case 'D':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200">
            シンプル ({score}点)
          </span>
        );
    }
  };

  // Helper for tag chips styling
  const getTagBadge = (tag: string) => {
    if (tag.includes('3桁除算')) {
      return (
        <span
          key={tag}
          className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-white shadow-2xs flex items-center gap-0.5"
        >
          <span>👑</span>
          {tag}
        </span>
      );
    }
    if (tag.includes('左右対称') || tag.includes('ツリー')) {
      return (
        <span
          key={tag}
          className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-0.5"
        >
          <span>🌲</span>
          {tag}
        </span>
      );
    }
    if (tag.includes('3桁到達') || tag.includes('迂回')) {
      return (
        <span
          key={tag}
          className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-0.5"
        >
          <span>⚡</span>
          {tag}
        </span>
      );
    }
    if (tag.includes('大数乗算')) {
      return (
        <span
          key={tag}
          className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-0.5"
        >
          <span>✖️</span>
          {tag}
        </span>
      );
    }
    if (tag.includes('4種')) {
      return (
        <span
          key={tag}
          className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-0.5"
        >
          <span>🔀</span>
          {tag}
        </span>
      );
    }
    if (tag.includes('3種')) {
      return (
        <span
          key={tag}
          className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-0.5"
        >
          <span>🔀</span>
          {tag}
        </span>
      );
    }
    if (tag.includes('0の生成')) {
      return (
        <span
          key={tag}
          className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200 flex items-center gap-0.5"
        >
          <span>🌀</span>
          {tag}
        </span>
      );
    }
    if (tag.includes('1の生成')) {
      return (
        <span
          key={tag}
          className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-0.5"
        >
          <span>✨</span>
          {tag}
        </span>
      );
    }
    return (
      <span
        key={tag}
        className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
      >
        {tag}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {/* Section Header (Seamless, unboxed) */}
      <div className="space-y-2.5 px-0.5">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base sm:text-lg text-slate-900 tracking-tight">解法一覧</h3>
            {isInputConfigured && solutions.length > 0 && (
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
                芸術度順
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowArtistryCriteria((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100/80 px-2.5 py-1.5 rounded-lg border border-amber-200/80 font-medium transition-colors shadow-2xs"
            title="芸術性の採点基準を表示"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>芸術性の基準とは？</span>
          </button>
        </div>

        {/* Artistry Criteria Collapsible Info Box */}
        <AnimatePresence>
          {showArtistryCriteria && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3 sm:p-4 text-xs text-amber-950 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between font-bold text-amber-900 border-b border-amber-200/60 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    解法の「芸術性」採点基準（基礎点: 15点 / 最大: 100点）
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowArtistryCriteria(false)}
                    className="text-amber-700 hover:text-amber-950 font-bold px-2 py-0.5 rounded bg-amber-100/80 hover:bg-amber-200 transition-colors text-[11px]"
                  >
                    閉じる
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/90 rounded-lg p-2 border border-amber-200/70 shadow-2xs">
                    <div className="font-bold text-amber-950 flex items-center justify-between">
                      <span>👑 3桁除算（最高峰）</span>
                      <span className="text-amber-700 font-bold font-mono text-[11px] bg-amber-100 px-1.5 py-0.2 rounded">+45点</span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-1">
                      計算途中で100以上の数を作り、直接割り算（÷2以上）で目標値へ収束させる最高峰の妙技（例: 144÷2）。
                    </p>
                  </div>
                  <div className="bg-white/90 rounded-lg p-2 border border-amber-200/70 shadow-2xs">
                    <div className="font-bold text-amber-950 flex items-center justify-between">
                      <span>🌲 左右対称ツリー構造</span>
                      <span className="text-amber-700 font-bold font-mono text-[11px] bg-amber-100 px-1.5 py-0.2 rounded">+30点</span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-1">
                      (AとB) と (CとD) を左右並行で同時に計算し、最後に真ん中で合体させる美しいツリー構造。
                    </p>
                  </div>
                  <div className="bg-white/90 rounded-lg p-2 border border-amber-200/70 shadow-2xs">
                    <div className="font-bold text-amber-950 flex items-center justify-between">
                      <span>⚡ 3桁到達（迂回）</span>
                      <span className="text-amber-700 font-bold font-mono text-[11px] bg-amber-100 px-1.5 py-0.2 rounded">+20点</span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-1">
                      初期カード（9以下）から計算の途中で100以上の大きな数へ大胆に引き上げてから着地するルート。
                    </p>
                  </div>
                  <div className="bg-white/90 rounded-lg p-2 border border-amber-200/70 shadow-2xs">
                    <div className="font-bold text-amber-950 flex items-center justify-between">
                      <span>✖️ 12以上×2以上の掛け算</span>
                      <span className="text-amber-700 font-bold font-mono text-[11px] bg-amber-100 px-1.5 py-0.2 rounded">最大+20点</span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-1">
                      掛ける順序によらず12以上×2以上が不可避となる掛け算（1組につき+15点）。※掛ける順序によって12未満同士に回避できる場合（例: 2×2×9を4×9として計算可能）は加点対象外。
                    </p>
                  </div>
                  <div className="bg-white/90 rounded-lg p-2 border border-amber-200/70 shadow-2xs">
                    <div className="font-bold text-amber-950 flex items-center justify-between">
                      <span>🎨 演算子の多様性</span>
                      <span className="text-amber-700 font-bold font-mono text-[11px] bg-amber-100 px-1.5 py-0.2 rounded">+10〜20点</span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-1">
                      加減乗除の4種すべてを融合（+20点）または3種融合（+10点）。※単一演算のみは -10点。
                    </p>
                  </div>
                  <div className="bg-white/90 rounded-lg p-2 border border-amber-200/70 shadow-2xs">
                    <div className="font-bold text-amber-950 flex items-center justify-between">
                      <span>✨ 0・1の意図的な生成</span>
                      <span className="text-amber-700 font-bold font-mono text-[11px] bg-amber-100 px-1.5 py-0.2 rounded">各+5点</span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-1">
                      引き算や割り算（N÷N）で自前で「0」や「1」を作り出し、余剰手札の整理に活用する工夫。
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Solutions Cards List */}
      {!isInputConfigured ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6 text-slate-400" />
          </div>
          <div>
            <h4 className="font-bold text-sm sm:text-base text-slate-800">
              TARGET と 5枚のカード数値を入力してください
            </h4>
            <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
              左側の入力フォームに目標値とカードの数値を入力するか、ゲーム画面のスクリーンショットをアップロードすると、5枚すべてを使い切る解法が自動的に一覧表示されます。
            </p>
          </div>
        </div>
      ) : displaySolutions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm sm:text-base text-slate-800">
              解法が見つかりませんでした
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
              この組み合わせでTARGETを作る解法が存在しません。数値を変更してください。
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {displaySolutions.map((sol, index) => {
            const isExpanded = expandedIds.has(sol.id);
            const isVariantExpanded = expandedVariantIds.has(sol.id);
            const art = sol.artistry;
            const variants = sol.variants || [];

            return (
              <div
                key={sol.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-xs transition-all space-y-2.5"
              >
                {/* Header row: Index, Grade & Toggle (pinned to right) */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                      #{String(index + 1).padStart(2, '0')}
                    </span>

                    {/* Artistry Badge */}
                    {getGradeBadge(art)}
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleExpand(sol.id)}
                    className="ml-auto shrink-0 text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 flex items-center gap-1.5 font-medium transition-colors"
                  >
                    <span>{isExpanded ? '手順を閉じる' : '手順を見る'}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </button>
                </div>

                {/* Formula display & Tags */}
                <div className="space-y-2">
                  <div className="font-mono text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    <span>{sol.expression}</span>
                    <span className="text-blue-600 font-extrabold ml-2.5">= {sol.target}</span>
                  </div>

                  {/* Artistry tags chips */}
                  {art && art.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {art.tags.map((tag) => getTagBadge(tag))}
                    </div>
                  )}
                </div>

                {/* Steps Accordion */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden pt-1"
                    >
                      <div className="bg-slate-50 rounded-xl p-3.5 space-y-2.5 border border-slate-200/80">
                        {/* Artistry Reasons Explanation */}
                        {art && art.reasons.length > 0 && (
                          <div className="bg-amber-50/70 border border-amber-200/70 rounded-lg p-2.5 text-xs text-amber-950">
                            <div className="font-bold flex items-center gap-1 text-[11px] text-amber-800 mb-1">
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              芸術的評価ポイント (スコア: {art.score}点)
                            </div>
                            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-700">
                              {art.reasons.map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Steps Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {sol.steps.map((st, i) => (
                            <div
                              key={i}
                              className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs flex items-center justify-between shadow-2xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center">
                                  {i + 1}
                                </span>
                                <span className="font-mono font-semibold text-slate-800">
                                  {st.leftValue} {st.operator} {st.rightValue} ={' '}
                                  <strong className="text-blue-600 font-bold">{st.result}</strong>
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                残り: [{st.cardsAfter.join(', ')}]
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 順序バリエーション (variants) */}
                {variants.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => toggleVariantExpand(sol.id)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 transition-colors group"
                    >
                      <span className="flex items-center gap-2">
                        <Shuffle className="w-3.5 h-3.5 text-blue-600" />
                        <span className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
                          順序バリエーション
                        </span>
                        <span className="font-bold text-blue-700 bg-blue-100/90 border border-blue-200/80 px-1.5 py-0.5 rounded text-[11px]">
                          +{variants.length} 通り
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-500 group-hover:text-slate-800 transition-colors">
                        {isVariantExpanded ? (
                          <>
                            <span>折りたたむ</span>
                            <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            <span>展開して確認</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </span>
                    </button>

                    <AnimatePresence>
                      {isVariantExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden pt-2 space-y-2"
                        >
                          <div className="bg-slate-50/90 rounded-xl p-3 space-y-2 border border-slate-200/80">
                            <div className="text-[11px] text-slate-500 px-0.5">
                              使用する数字と演算の骨格は同一で、計算する順序が異なるパターンです。
                            </div>

                            <div className="space-y-2">
                              {variants.map((v, vIdx) => (
                                <div
                                  key={v.id}
                                  className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs space-y-1.5"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                        #{vIdx + 1}
                                      </span>
                                      <span className="font-mono text-xs sm:text-sm font-bold text-slate-900">
                                        {v.expression}{' '}
                                        <span className="text-blue-600 font-extrabold">= {sol.target}</span>
                                      </span>
                                    </div>
                                    {v.artistry && v.artistry.tags.length > 0 && (
                                      <div className="flex items-center gap-1">
                                        {v.artistry.tags.slice(0, 2).map((t) => (
                                          <span
                                            key={t}
                                            className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200"
                                          >
                                            {t}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Step sequence preview */}
                                  <div className="text-[11px] font-mono text-slate-600 bg-slate-50 rounded px-2.5 py-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 border border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-400">手順:</span>
                                    {v.steps.map((st, sIdx) => (
                                      <span key={sIdx} className="inline-flex items-center gap-1">
                                        {sIdx > 0 && <span className="text-slate-300">→</span>}
                                        <span>
                                          {st.leftValue} {st.operator} {st.rightValue} ={' '}
                                          <strong className="text-blue-600 font-bold">{st.result}</strong>
                                        </span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
