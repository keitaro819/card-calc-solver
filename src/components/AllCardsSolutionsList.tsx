import React, { useState, useMemo } from 'react';
import { Solution, Operator } from '../types.ts';
import {
  Search,
  Copy,
  Check,
  Play,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  Info,
  Flame,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type SortMode = 'artistry-desc' | 'default' | 'artistry-asc';

interface AllCardsSolutionsListProps {
  solutions: Solution[]; // Already filtered for usesAllCards
  target: number | '';
  initialCards: Array<number | ''>;
  onOpenSimulator: (sol: Solution) => void;
}

export const AllCardsSolutionsList: React.FC<AllCardsSolutionsListProps> = ({
  solutions,
  target,
  initialCards,
  onOpenSimulator,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOpFilter, setSelectedOpFilter] = useState<Operator | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('artistry-desc');
  const [showArtistryCriteria, setShowArtistryCriteria] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [allCopied, setAllCopied] = useState(false);

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

  const expandAll = () => {
    setExpandedIds(new Set(solutions.map((s) => s.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Filter solutions
  const filteredSolutions = useMemo(() => {
    return solutions.filter((sol) => {
      // Operator filter
      if (selectedOpFilter && !sol.operatorsUsed.includes(selectedOpFilter)) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const exprMatch = sol.expression.toLowerCase().includes(q);
        const stepsMatch = sol.steps.some((st) => st.expression.toLowerCase().includes(q));
        const tagsMatch = sol.artistry?.tags.some((t) => t.toLowerCase().includes(q));
        if (!exprMatch && !stepsMatch && !tagsMatch) return false;
      }

      return true;
    });
  }, [solutions, selectedOpFilter, searchQuery]);

  // Sort solutions according to chosen mode
  const displaySolutions = useMemo(() => {
    const list = [...filteredSolutions];
    if (sortMode === 'artistry-desc') {
      return list.sort((a, b) => {
        const scoreA = a.artistry?.score ?? 0;
        const scoreB = b.artistry?.score ?? 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.expression.localeCompare(b.expression);
      });
    } else if (sortMode === 'artistry-asc') {
      return list.sort((a, b) => {
        const scoreA = a.artistry?.score ?? 0;
        const scoreB = b.artistry?.score ?? 0;
        if (scoreA !== scoreB) return scoreA - scoreB;
        return a.expression.localeCompare(b.expression);
      });
    }
    // 'default': standard order from solver
    return list;
  }, [filteredSolutions, sortMode]);

  // Copy single formula
  const handleCopySingle = (sol: Solution) => {
    navigator.clipboard.writeText(`${sol.expression} = ${sol.target}`);
    setCopiedId(sol.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Copy all formulas
  const handleCopyAll = () => {
    const sortLabel =
      sortMode === 'artistry-desc'
        ? '芸術性が高い順'
        : sortMode === 'artistry-asc'
        ? 'シンプル順'
        : '標準順';

    const text = [
      `【カード計算パズル 解法一覧 (${sortLabel})】`,
      `TARGET: ${target}`,
      `カード: [${initialCards.join(', ')}]`,
      `パターン総数: ${displaySolutions.length} 通り`,
      '--------------------------------------------------',
      ...displaySolutions.map((s, idx) => {
        const art = s.artistry;
        const artLine = art
          ? `[芸術度: ${art.grade} (${art.score}点 / ★${art.stars}) タグ: ${art.tags.join(', ') || '基本演算'}]`
          : '';
        const stepLines = s.steps
          .map((st, i) => `   (${i + 1}) ${st.leftValue} ${st.operator} ${st.rightValue} = ${st.result}`)
          .join('\n');
        return `[#${idx + 1}] ${s.expression} = ${s.target}\n${artLine}\n${stepLines}`;
      }),
    ].join('\n\n');

    navigator.clipboard.writeText(text);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  };

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
    if (tag.includes('0の活用')) {
      return (
        <span
          key={tag}
          className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200 flex items-center gap-0.5"
        >
          <span>🌀</span>
          {tag}
        </span>
      );
    }
    if (tag.includes('1の活用')) {
      return (
        <span
          key={tag}
          className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-0.5"
        >
          <span>⚖️</span>
          {tag}
        </span>
      );
    }
    if (tag.includes('九九超え')) {
      return (
        <span
          key={tag}
          className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-0.5"
        >
          <span>🎯</span>
          {tag}
        </span>
      );
    }
    if (tag.includes('4種')) {
      return (
        <span
          key={tag}
          className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-0.5"
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
    if (tag.includes('除算') || tag.includes('1の生成')) {
      return (
        <span
          key={tag}
          className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-0.5"
        >
          <span>÷</span>
          {tag}
        </span>
      );
    }
    if (tag.includes('迂回')) {
      return (
        <span
          key={tag}
          className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-0.5"
        >
          <span>⚡</span>
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
      {/* List Header Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-slate-800">解法一覧</h3>
            <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-2 py-0.5 rounded-full">
              {solutions.length} 通り
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowArtistryCriteria((prev) => !prev)}
              className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800 bg-amber-50/80 hover:bg-amber-100/80 px-2.5 py-1.5 rounded-lg border border-amber-200 font-medium transition-colors"
              title="芸術性の採点基準を表示"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>芸術性の基準とは？</span>
            </button>

            <button
              type="button"
              onClick={handleCopyAll}
              disabled={solutions.length === 0}
              className="flex items-center gap-1.5 text-xs bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 font-medium shadow-xs transition-colors"
            >
              {allCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">コピー完了</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>全解法をコピー</span>
                </>
              )}
            </button>
          </div>
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
              <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-xs text-amber-950 space-y-2">
                <div className="flex items-center justify-between font-bold text-amber-900 border-b border-amber-200/60 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    解法の「芸術性」判断基準
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowArtistryCriteria(false)}
                    className="text-amber-700 hover:text-amber-900 text-[11px]"
                  >
                    閉じる
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 leading-relaxed">
                  <div className="bg-white/80 rounded p-2 border border-amber-200/50">
                    <div className="font-bold text-amber-900 flex items-center gap-1">
                      <span>🌀</span> 0の活用 (加減算は等価 ★★★★★)
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      `A - A = 0` などを生成し、手札にない「0」を経由して相殺。<strong>0の加算（+0）と減算（-0）は等価</strong>として同じ芸術性で高く評価。
                    </p>
                  </div>
                  <div className="bg-white/80 rounded p-2 border border-amber-200/50">
                    <div className="font-bold text-amber-900 flex items-center gap-1">
                      <span>⚖️</span> 1の活用 (乗除算は等価 ★★★★☆)
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      単位元「1」を活用して値を保ちながら手札をスマートに消化。<strong>1の乗算（×1）と除算（÷1）は等価</strong>として同じ芸術性で評価。
                    </p>
                  </div>
                  <div className="bg-white/80 rounded p-2 border border-amber-200/50">
                    <div className="font-bold text-amber-900 flex items-center gap-1">
                      <span>🎯</span> 九九超えの掛け算 (難易度 ★★★★☆)
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      九九(9×9)の範囲を超える掛け算（`13×7`, `24×3`, `14×5`, `18×4` 等）を駆使する解法（※×1や×0は除外）。
                    </p>
                  </div>
                  <div className="bg-white/80 rounded p-2 border border-amber-200/50">
                    <div className="font-bold text-amber-900 flex items-center gap-1">
                      <span>🔀</span> 演算構造の多様性・融合
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      加減乗除（+ - × ÷）や相殺構造の3〜4種を柔軟に組み合わせるパターン。単一演算子のみの連続は芸術点が低くなります。
                    </p>
                  </div>
                  <div className="bg-white/80 rounded p-2 border border-amber-200/50">
                    <div className="font-bold text-amber-900 flex items-center gap-1">
                      <span>÷</span> 巧みな除算・1の生成
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      余りの出ない割り算による鮮やかな縮約や、同数除算（`N ÷ N = 1`）による1の生成を評価。
                    </p>
                  </div>
                  <div className="bg-white/80 rounded p-2 border border-amber-200/50">
                    <div className="font-bold text-amber-900 flex items-center gap-1">
                      <span>⚡</span> 大胆な迂回・対称構造
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      目標値より大幅に大きな中間値を作ってから着地するルートや、左右並行の対称ツリー構造を評価。
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sort & Filter controls */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          {/* Sort selector */}
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 font-semibold px-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              並び替え:
            </span>
            <button
              type="button"
              onClick={() => setSortMode('artistry-desc')}
              className={`px-2.5 py-1 rounded-md text-xs transition-all flex items-center gap-1 ${
                sortMode === 'artistry-desc'
                  ? 'bg-amber-500 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-medium'
              }`}
            >
              <span>✨ 芸術性が高い順</span>
            </button>
            <button
              type="button"
              onClick={() => setSortMode('default')}
              className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                sortMode === 'default'
                  ? 'bg-slate-800 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-medium'
              }`}
            >
              標準
            </button>
            <button
              type="button"
              onClick={() => setSortMode('artistry-asc')}
              className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                sortMode === 'artistry-asc'
                  ? 'bg-slate-700 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-medium'
              }`}
            >
              シンプル順
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="数式やタグ(例: 3桁除算, 九九超え)..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Operator Filter Chips */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-400 font-medium mr-0.5">演算子:</span>
            <button
              type="button"
              onClick={() => setSelectedOpFilter(null)}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                selectedOpFilter === null
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              全
            </button>
            {(['+', '-', '×', '÷'] as Operator[]).map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => setSelectedOpFilter(selectedOpFilter === op ? null : op)}
                className={`px-2 py-1 rounded-md text-xs font-mono font-bold transition-colors ${
                  selectedOpFilter === op
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {op}
              </button>
            ))}
          </div>

          {/* Expand / Collapse all */}
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={expandAll}
              className="text-slate-500 hover:text-slate-800 px-1.5 py-1 rounded hover:bg-slate-100 transition-colors"
            >
              すべて展開
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-slate-500 hover:text-slate-800 px-1.5 py-1 rounded hover:bg-slate-100 transition-colors"
            >
              折りたたむ
            </button>
          </div>
        </div>
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
              {solutions.length === 0
                ? '解法が見つかりませんでした'
                : '検索条件に一致する解法がありません'}
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
              {solutions.length === 0
                ? 'この組み合わせでTARGETを作る解法が存在しません。数値を変更してください。'
                : '検索フィルターまたは演算子フィルターをクリアしてください。'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {displaySolutions.map((sol, index) => {
            const isExpanded = expandedIds.has(sol.id);
            const isCopied = copiedId === sol.id;
            const art = sol.artistry;

            return (
              <div
                key={sol.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-3.5 shadow-xs transition-all"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      #{String(index + 1).padStart(2, '0')}
                    </span>

                    {/* Artistry Badge */}
                    {getGradeBadge(art)}

                    {/* Star rating */}
                    {art && (
                      <span
                        className="text-xs font-mono tracking-tight text-amber-400"
                        title={`芸術性スコア: ${art.score}/100点`}
                      >
                        {'★'.repeat(art.stars)}
                        <span className="text-slate-200">{'★'.repeat(5 - art.stars)}</span>
                      </span>
                    )}

                    {/* Operators used */}
                    <div className="flex items-center gap-1 ml-1">
                      {sol.operatorsUsed.map((op) => (
                        <span
                          key={op}
                          className="w-5 h-5 rounded bg-slate-100 text-slate-700 font-mono text-xs font-bold flex items-center justify-center"
                        >
                          {op}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopySingle(sol)}
                      className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 flex items-center gap-1 transition-colors"
                      title="数式をコピー"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700 font-semibold">コピー済</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-500" />
                          <span>コピー</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenSimulator(sol)}
                      className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200 flex items-center gap-1 font-medium transition-colors"
                      title="ステップシミュレーターで再生"
                    >
                      <Play className="w-3 h-3" />
                      <span>再生</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleExpand(sol.id)}
                      className="text-xs text-slate-500 hover:text-slate-800 p-1 rounded hover:bg-slate-100 transition-colors"
                      title={isExpanded ? '手順を閉じる' : '手順を見る'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Formula display & Tags */}
                <div className="pt-2.5 pb-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-mono text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                      <span>{sol.expression}</span>
                      <span className="text-blue-600 font-extrabold ml-2">= {sol.target}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpand(sol.id)}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>{isExpanded ? '手順を閉じる' : '手順を見る'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
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
                      className="overflow-hidden pt-2 border-t border-slate-100"
                    >
                      <div className="bg-slate-50 rounded-lg p-3 space-y-2.5 border border-slate-200/70">
                        {/* Artistry Reasons Explanation */}
                        {art && art.reasons.length > 0 && (
                          <div className="bg-amber-50/60 border border-amber-200/60 rounded-md p-2 text-xs text-amber-900">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {sol.steps.map((st, i) => (
                            <div
                              key={i}
                              className="bg-white border border-slate-200 rounded-md p-2 text-xs flex items-center justify-between"
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
