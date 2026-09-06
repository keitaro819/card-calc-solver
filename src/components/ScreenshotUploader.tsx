import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, Sparkles, Loader2, RefreshCw, AlertCircle, CheckCircle2, FileImage } from 'lucide-react';

interface ScreenshotUploaderProps {
  onDataDetected: (target: number, cards: number[], imagePreviewUrl?: string) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (val: boolean) => void;
  error: string | null;
  setError: (val: string | null) => void;
  resetTrigger?: number;
}

export const ScreenshotUploader: React.FC<ScreenshotUploaderProps> = ({
  onDataDetected,
  isAnalyzing,
  setIsAnalyzing,
  error,
  setError,
  resetTrigger,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [lastMimeType, setLastMimeType] = useState<string>('image/png');
  const [dragActive, setDragActive] = useState(false);
  const [detectionSuccess, setDetectionSuccess] = useState(false);
  const [detectionNotes, setDetectionNotes] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear preview and detection state on reset
  useEffect(() => {
    if (resetTrigger !== undefined && resetTrigger > 0) {
      setImagePreview(null);
      setDetectionSuccess(false);
      setDetectionNotes(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [resetTrigger]);

  // Support paste from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('画像ファイル（PNG, JPG, WebP）を選択してください。');
      return;
    }

    setError(null);
    setDetectionSuccess(false);
    setDetectionNotes(null);
    setLastMimeType(file.type);

    // Read preview
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target?.result as string;
      setImagePreview(base64Data);
      await analyzeImage(base64Data, file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleRetry = () => {
    if (imagePreview) {
      analyzeImage(imagePreview, lastMimeType);
    }
  };

  const analyzeImage = async (base64Url: string, mimeType: string) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze-screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64Url,
          mimeType,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '画像の解析に失敗しました。');
      }

      const targetVal = Number(data.target);
      const cardsVal = Array.isArray(data.cards)
        ? data.cards.map(Number).filter((n) => !isNaN(n) && n > 0)
        : [];

      if (!targetVal || isNaN(targetVal) || targetVal <= 0 || cardsVal.length < 5) {
        throw new Error(
          data.error || '画像からTARGET（目標値）または5枚のカード数値を十分に認識できませんでした。左側の入力欄で数値を直接入力してください。'
        );
      }

      setDetectionSuccess(true);
      setDetectionNotes(data.notes || `TARGET: ${targetVal}, カード: [${cardsVal.slice(0, 5).join(', ')}] を認識しました。`);
      onDataDetected(targetVal, cardsVal.slice(0, 5), base64Url);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Gemini Vision AI での画像解析に失敗しました。数値を手動で調整してください。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Load sample problem screenshot / test data
  const handleLoadSample = () => {
    setError(null);
    setDetectionSuccess(true);
    setDetectionNotes('サンプルデータ（TARGET: 31, カード: [6, 1, 1, 4, 5]）をロードしました。');
    onDataDetected(31, [6, 1, 1, 4, 5], undefined);
  };

  return (
    <div className="space-y-3">
      {/* Upload Dropzone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[170px] ${
          dragActive
            ? 'border-blue-500 bg-blue-50/70'
            : imagePreview
            ? 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'
            : 'border-slate-300 hover:border-blue-400 bg-white hover:bg-slate-50/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
        />

        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center space-y-2 py-4">
            <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
            <span className="text-sm font-semibold text-slate-800">
              画像を解析中...
            </span>
          </div>
        ) : imagePreview ? (
          <div className="flex flex-col items-center justify-center w-full">
            <div className="relative group max-h-[130px] overflow-hidden rounded-lg border border-slate-200 shadow-xs mb-2">
              <img
                src={imagePreview}
                alt="スクリーンショット"
                className="max-h-[130px] object-contain rounded-lg"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                <RefreshCw className="w-3.5 h-3.5" />
                画像を変更
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2 py-2">
            <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                スクリーンショットをドロップ
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                クリックして選択 または <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px]">Ctrl+V</kbd>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick sample button */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleLoadSample();
          }}
          className="text-xs text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 font-medium transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          サンプル問題で試す
        </button>

        {imagePreview && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setImagePreview(null);
              setDetectionSuccess(false);
              setDetectionNotes(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            クリア
          </button>
        )}
      </div>

      {/* Status Banners */}
      {detectionSuccess && (
        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">数値を認識しました</span>
        </div>
      )}

      {error && (
        <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-start justify-between gap-2 text-xs text-red-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-red-700">{error}</p>
            </div>
          </div>
          {imagePreview && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={isAnalyzing}
              className="shrink-0 flex items-center gap-1 bg-white hover:bg-red-100 text-red-700 border border-red-300 font-semibold px-2 py-0.5 rounded shadow-xs transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>再試行</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
