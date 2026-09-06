import React, { useState, useMemo } from 'react';
import { Solution, Operator } from '../types.ts';
import { StepSimulator } from './StepSimulator.tsx';
import {
  Sparkles,
  Search,
  Copy,
  Check,
  Play,
  Filter,
  ChevronDown,
  ChevronUp,
  Layers,
  Zap,
  Target,
  ArrowUpDown,
  BookOpen,
  Share2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SolutionViewerProps {
  solutions: Solution[];
  target: number;
  initialCards: number[];
  onApplyStepToGame?: (cards: number[]) => void;
  onClose?: () => void;
}

type TabType = 'all' | 'all-cards' | 'shortest' | 'with-div';
type SortType = 'steps-asc' | 'steps-desc' | 'cards-desc';

export const SolutionViewer: React.FC<SolutionViewerProps> = ({
  solutions,
  target,
  initialCards,
  onApplyStepToGame,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOpFilter, setSelectedOpFilter] = useState<Operator | null>(null);
  const [expandedSolutionId, setExpandedSolutionId] = useState<string | null>(null);
  const [activeSimulatorSolution, setActiveSimulatorSolution] = useState<Solution | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [allCopied, setAllCopied] = useState(false);
  const [sortBy, setSortBy] = useState<SortType>('cards-desc');

  // Categorize counts
  const allCardsSolutions = useMemo(() => solutions.filter((s) => s.usesAllCards), [solutions]);
  const minStepsCount = useMemo(() => {
    if (solutions.length === 0) return 0;
    return Math.min(...solutions.map((s) => s.steps.length));
  }, [solutions]);
  const shortestSolutions = useMemo(
    () => solutions.filter((s) => s.steps.length === minStepsCount),
    [solutions, minStepsCount]
  );
  const divSolutions = useMemo(
    () => solutions.filter((s) => s.operatorsUsed.includes('÷')),
    [solutions]
  );

  // Filter and sort solutions
  const filteredSolutions = useMemo(() => {
    return solutions
      .filter((sol) => {
        // Tab filter
        if (activeTab === 'all-cards' && !sol.usesAllCards) return false;
        if (activeTab === 'shortest' && sol.steps.length !== minStepsCount) return false;
        if (activeTab === 'with-div' && !sol.operatorsUsed.includes('÷')) return false;

        // Operator chip filter
        if (selectedOpFilter && !sol.operatorsUsed.includes(selectedOpFilter)) return false;

        // Search query filter
        if (searchQuery.trim()) {
          const query = searchQuery.trim().toLowerCase();
          const matchExpr = sol.expression.toLowerCase().includes(query);
          const matchSteps = sol.steps.some((st) => st.expression.toLowerCase().includes(query));
          if (!matchExpr && !matchSteps) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'steps-asc') {
          return a.steps.length - b.steps.length;
        }
        if (sortBy === 'steps-desc') {
          return b.steps.length - a.steps.length;
        }
        // cards-desc: 5 cards first, then by fewer steps
        if (a.cardsUsedCount !== b.cardsUsedCount) {
          return b.cardsUsedCount - a.cardsUsedCount;
        }
        return a.steps.length - b.steps.length;
      });
  }, [solutions, activeTab, selectedOpFilter, searchQuery, sortBy, minStepsCount]);

  const handleCopyFormula = (sol: Solution) => {
    const text = `${sol.expression} = ${sol.target}`;
    navigator.clipboard.writeText(text);
    setCopiedId(sol.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = () => {
    const text = `【TARGET ${target} の解答一覧 (${solutions.length}通り)】\n初期カード: [${initialCards.join(
      ', '
    )}]\n\n` +
      solutions
        .map(
          (s, idx) =>
            `${idx + 1}. ${s.expression} = ${s.target} (${s.cardsUsedCount}枚使用, ${s.steps.length}手)\n` +
            s.steps.map((st, si) => `   手順${si + 1}: ${st.expression}`).join('\n')
        )
        .join('\n\n');

    navigator.clipboard.writeText(text);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2200);
  };

  const toggleExpand = (id: string) => {
    setExpandedSolutionId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex flex-col h-full max-h-[85vh] bg-white text-slate-800 rounded-xl overflow-hidden border border-slate-200 shadow-2xl">
      {/* Top Header Bar */}
      <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-lg text-white shadow-sm">
            Σ
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
                Valid Calculation Patterns
              </h2>
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {solutions.length} patterns
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Target: <span className="text-slate-800 font-bold">{target}</span> ｜ Input Cards: [
              {initialCards.join(', ')}]
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 font-medium shadow-sm transition-colors"
            title="すべての解答テキストをクリップボードにコピー"
          >
            {allCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{allCopied ? 'コピー完了' : '全パターンをコピー'}</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg font-semibold shadow-sm transition-colors"
            >
              閉じる
            </button>
          )}
        </div>
      </div>

      {/* Simulator Modal / Inline if chosen */}
      {activeSimulatorSolution && (
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <StepSimulator
            solution={activeSimulatorSolution}
            initialCards={initialCards}
            onClose={() => setActiveSimulatorSolution(null)}
            onApplyStepToGame={onApplyStepToGame}
          />
        </div>
      )}

      {/* Statistics Quick Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 sm:px-5 sm:py-3 bg-white border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`p-3 rounded-lg border text-left transition-all ${
            activeTab === 'all'
              ? 'bg-blue-50/70 border-blue-500 ring-1 ring-blue-500/30 shadow-xs'
              : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1 font-medium">
              <Layers className="w-3.5 h-3.5 text-blue-600" /> 全解法パターン
            </span>
          </div>
          <div className="text-xl font-black text-slate-800 mt-1">{solutions.length}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all-cards')}
          className={`p-3 rounded-lg border text-left transition-all ${
            activeTab === 'all-cards'
              ? 'bg-blue-50/70 border-blue-500 ring-1 ring-blue-500/30 shadow-xs'
              : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-blue-600 font-medium">
            <span className="flex items-center gap-1">
              <Target className="w-3.5 h-3.5" /> 5枚完全使用
            </span>
          </div>
          <div className="text-xl font-black text-blue-700 mt-1">{allCardsSolutions.length}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('shortest')}
          className={`p-3 rounded-lg border text-left transition-all ${
            activeTab === 'shortest'
              ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500/30 shadow-xs'
              : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-700 font-medium">
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> 最短手数 ({minStepsCount}手)
            </span>
          </div>
          <div className="text-xl font-black text-emerald-700 mt-1">{shortestSolutions.length}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('with-div')}
          className={`p-3 rounded-lg border text-left transition-all ${
            activeTab === 'with-div'
              ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500/30 shadow-xs'
              : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-purple-700 font-medium">
            <span className="flex items-center gap-1">
              <span className="font-bold">÷</span> 割り算活用
            </span>
          </div>
          <div className="text-xl font-black text-purple-700 mt-1">{divSolutions.length}</div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 sm:px-5 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="数式や数字で検索 (例: 35, × 5, 24)"
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Operator chips & Sort */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-xs">
            <span className="text-[11px] text-slate-500 px-1.5 font-medium">演算子:</span>
            {(['+', '-', '×', '÷'] as Operator[]).map((op) => {
              const isSelected = selectedOpFilter === op;
              return (
                <button
                  key={op}
                  type="button"
                  onClick={() => setSelectedOpFilter(isSelected ? null : op)}
                  className={`w-6 h-6 rounded text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {op}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-xs shadow-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="bg-transparent text-slate-700 border-none outline-none text-xs font-medium cursor-pointer"
            >
              <option value="cards-desc">全カード優先</option>
              <option value="steps-asc">最短手数順</option>
              <option value="steps-desc">最多手数順</option>
            </select>
          </div>
        </div>
      </div>

      {/* Solution List */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 bg-slate-100/50">
        {filteredSolutions.length === 0 ? (
          <div className="text-center py-12 text-slate-400 space-y-2">
            <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-medium text-slate-600">該当する解答パターンが見つかりませんでした</p>
            <p className="text-xs text-slate-400">フィルターや検索語を変更してみてください。</p>
          </div>
        ) : (
          filteredSolutions.map((sol, index) => {
            const isExpanded = expandedSolutionId === sol.id;
            const isCopied = copiedId === sol.id;
            const isSimplest = sol.steps.length === minStepsCount;

            return (
              <motion.div
                key={sol.id}
                layout
                className={`p-4 border rounded-lg transition-colors bg-white shadow-xs ${
                  sol.usesAllCards
                    ? 'border-blue-200 hover:border-blue-300'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                {/* Header Pattern label and badges */}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                    Pattern #{String(index + 1).padStart(3, '0')}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {isSimplest && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded font-bold">
                        SIMPLEST
                      </span>
                    )}

                    {sol.usesAllCards && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded font-bold flex items-center gap-1">
                        <Target className="w-2.5 h-2.5" /> 5枚全て使用
                      </span>
                    )}

                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded font-medium">
                      {sol.steps.length}手
                    </span>
                  </div>
                </div>

                {/* Main formula row */}
                <code className="text-base sm:text-lg font-mono text-slate-800 block font-bold">
                  {sol.expression} <span className="text-blue-600 font-extrabold">= {sol.target}</span>
                </code>

                {/* Step preview subtitle */}
                <p className="text-xs text-slate-500 mt-2 italic font-mono">
                  Step-by-step: {sol.steps.map((s) => s.expression).join(' → ')}
                </p>

                {/* Actions row */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggleExpand(sol.id)}
                    className="flex items-center gap-1 text-xs text-slate-600 hover:text-blue-600 font-medium transition-colors"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        手順を折りたたむ
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        詳細手順を見る ({sol.steps.length}ステップ)
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyFormula(sol)}
                      className="flex items-center gap-1 text-xs bg-white hover:bg-slate-50 text-slate-700 px-2.5 py-1 rounded border border-slate-200 shadow-xs transition-colors"
                      title="数式をコピー"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          コピー済
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          コピー
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveSimulatorSolution(sol)}
                      className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded font-semibold shadow-xs transition-colors"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      ステップ再生
                    </button>
                  </div>
                </div>

                {/* Expanded step details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mt-3 pt-3 border-t border-slate-100 space-y-2"
                    >
                      <div className="text-xs font-semibold text-slate-600 mb-1">
                        【ステップごとの計算過程と残カード】
                      </div>

                      <div className="space-y-1.5">
                        {sol.steps.map((st, stepIdx) => {
                          const isFinal = stepIdx === sol.steps.length - 1;
                          return (
                            <div
                              key={stepIdx}
                              className={`p-2.5 rounded-lg text-xs flex flex-wrap items-center justify-between gap-2 border ${
                                isFinal
                                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                                  : 'bg-slate-50 border-slate-200 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2 font-mono">
                                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] flex items-center justify-center font-bold">
                                  {stepIdx + 1}
                                </span>
                                <span className="font-bold text-sm text-slate-900">{st.expression}</span>
                              </div>

                              <div className="text-[11px] text-slate-500 font-sans">
                                <span>残カード: </span>
                                <span className="font-mono text-slate-800 font-semibold">
                                  [{st.cardsAfter.join(', ')}]
                                </span>
                                {isFinal && (
                                  <span className="ml-2 text-emerald-700 font-bold">
                                    ✓ TARGET達成！
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Footer bar */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500 font-medium">
        制約条件: 分数・マイナス値禁止 ｜ 一度合体したカードは再利用不可 ｜ 4則演算 (+, -, ×, ÷)
      </div>
    </div>
  );
};
