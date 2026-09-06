import React, { useState } from 'react';
import { PRESET_PUZZLES, CardPresetConfig, getRandomSuit } from '../presets.ts';
import { solveGame } from '../solver.ts';
import { Sparkles, Dices, RotateCcw, AlertCircle, Check, X } from 'lucide-react';

interface CustomInputModalProps {
  currentTarget: number;
  currentCards: number[];
  onApply: (target: number, cards: number[], name?: string) => void;
  onClose: () => void;
}

export const CustomInputModal: React.FC<CustomInputModalProps> = ({
  currentTarget,
  currentCards,
  onApply,
  onClose,
}) => {
  const [targetInput, setTargetInput] = useState<string>(currentTarget.toString());
  const [cardsInput, setCardsInput] = useState<string[]>(
    currentCards.map((c) => c.toString())
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  // Check how many solutions exist for current inputs
  const handleCalculatePreview = () => {
    setErrorMsg(null);
    const targetVal = parseInt(targetInput, 10);
    if (isNaN(targetVal) || targetVal <= 0) {
      setErrorMsg('TARGETには1以上の整数を入力してください');
      return;
    }

    const cardVals = cardsInput.map((c) => parseInt(c, 10));
    if (cardVals.some((c) => isNaN(c) || c <= 0)) {
      setErrorMsg('5枚のカードすべてに1以上の整数を入力してください');
      return;
    }

    const sols = solveGame(cardVals, targetVal);
    setPreviewCount(sols.length);
  };

  const handleApplyPreset = (preset: CardPresetConfig) => {
    setTargetInput(preset.target.toString());
    setCardsInput(preset.cards.map((c) => c.toString()));
    setPreviewCount(null);
    setErrorMsg(null);
    onApply(preset.target, preset.cards, preset.name);
  };

  const handleGenerateRandom = () => {
    // Generate a solvable random puzzle
    // Pick 5 random numbers between 1 and 9
    for (let attempt = 0; attempt < 50; attempt++) {
      const randomCards = Array.from({ length: 5 }, () => Math.floor(Math.random() * 9) + 1);
      // Pick a reasonable target between 10 and 60
      const randomTarget = Math.floor(Math.random() * 50) + 10;
      const sols = solveGame(randomCards, randomTarget);
      if (sols.length >= 3 && sols.some((s) => s.usesAllCards)) {
        setTargetInput(randomTarget.toString());
        setCardsInput(randomCards.map((c) => c.toString()));
        setPreviewCount(sols.length);
        setErrorMsg(null);
        return;
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const targetVal = parseInt(targetInput, 10);
    if (isNaN(targetVal) || targetVal <= 0) {
      setErrorMsg('TARGETには1以上の整数を入力してください');
      return;
    }

    const cardVals = cardsInput.map((c) => parseInt(c, 10));
    if (cardVals.some((c) => isNaN(c) || c <= 0)) {
      setErrorMsg('5枚のカードすべてに1以上の正の整数を入力してください');
      return;
    }

    const sols = solveGame(cardVals, targetVal);
    if (sols.length === 0) {
      // Warn but allow or let user confirm
      setErrorMsg('※ この数字とTARGETの組み合わせには、解法が存在しません。別の数字を試してください。');
      return;
    }

    onApply(targetVal, cardVals, 'カスタム出題');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl text-slate-800">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center font-bold text-sm text-white">
              Σ
            </div>
            <h3 className="font-bold text-base text-slate-800">問題の選択・カスタム入力</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Preset Buttons */}
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-500 font-bold block mb-2">
              プリセットから選択:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_PUZZLES.map((p, idx) => {
                const isSelected =
                  currentTarget === p.target &&
                  JSON.stringify(currentCards) === JSON.stringify(p.cards);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500/30 text-blue-900 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-blue-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>{p.name}</span>
                      <span className="text-blue-600 font-bold">TARGET {p.target}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-1">
                      [{p.cards.join(', ')}]
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                自由な数値を指定:
              </label>
              <button
                type="button"
                onClick={handleGenerateRandom}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 font-medium transition-colors"
              >
                <Dices className="w-3.5 h-3.5" />
                ランダム問題生成
              </button>
            </div>

            {/* Target input */}
            <div>
              <label className="text-xs text-slate-600 font-medium block mb-1">TARGET (目標値):</label>
              <input
                type="number"
                min="1"
                max="999"
                value={targetInput}
                onChange={(e) => {
                  setTargetInput(e.target.value);
                  setPreviewCount(null);
                }}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-lg font-bold text-slate-800 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xs"
                placeholder="例: 31"
              />
            </div>

            {/* 5 Cards input */}
            <div>
              <label className="text-xs text-slate-600 font-medium block mb-1">
                5枚のカード (各1〜99):
              </label>
              <div className="grid grid-cols-5 gap-2">
                {cardsInput.map((val, i) => (
                  <input
                    key={i}
                    type="number"
                    min="1"
                    max="99"
                    value={val}
                    onChange={(e) => {
                      const next = [...cardsInput];
                      next[i] = e.target.value;
                      setCardsInput(next);
                      setPreviewCount(null);
                    }}
                    className="w-full py-2 bg-white border border-slate-200 rounded-lg text-center text-lg font-bold text-slate-800 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xs"
                    placeholder={`#${i + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Preview Calculation */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleCalculatePreview}
                className="text-xs text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 font-medium shadow-xs transition-colors"
              >
                解法の存在をチェック
              </button>

              {previewCount !== null && (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {previewCount} 通りの解法があります
                </span>
              )}
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="text-xs px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 shadow-xs font-medium transition-colors"
              >
                キャンセル
              </button>

              <button
                type="submit"
                className="text-xs font-semibold px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition-all"
              >
                この問題でスタート
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
