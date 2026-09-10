import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, Loader2, RefreshCw, AlertCircle, CheckCircle2, FileImage } from 'lucide-react';

interface ScreenshotUploaderProps {
  onDataDetected: (target: number, cards: number[], imagePreviewUrl?: string) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (val: boolean) => void;
  error: string | null;
  setError: (val: string | null) => void;
  resetTrigger?: number;
}

// Helper to compress and resize large screenshots before uploading
function compressImageForUpload(file: File, maxDim = 1280): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => {
      resolve({ base64: '', mimeType: file.type });
    };
    reader.onload = () => {
      const originalBase64 = reader.result as string;
      const img = new Image();
      img.onerror = () => {
        resolve({ base64: originalBase64, mimeType: file.type });
      };
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ base64: originalBase64, mimeType: file.type });
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.88);
          resolve({ base64: compressed, mimeType: 'image/jpeg' });
        } catch {
          resolve({ base64: originalBase64, mimeType: file.type });
        }
      };
      img.src = originalBase64;
    };
    reader.readAsDataURL(file);
  });
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
  const [lastCompressedBase64, setLastCompressedBase64] = useState<string | null>(null);
  const [lastMimeType, setLastMimeType] = useState<string>('image/jpeg');
  const [dragActive, setDragActive] = useState(false);
  const [detectionSuccess, setDetectionSuccess] = useState(false);
  const [detectionNotes, setDetectionNotes] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear preview and detection state on reset
  useEffect(() => {
    if (resetTrigger !== undefined && resetTrigger > 0) {
      setImagePreview(null);
      setLastCompressedBase64(null);
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

    // Compress & resize for efficient upload
    const { base64, mimeType } = await compressImageForUpload(file);
    if (!base64) {
      setError('画像の読み込みに失敗しました。');
      return;
    }

    setImagePreview(base64);
    setLastCompressedBase64(base64);
    setLastMimeType(mimeType);

    await analyzeImage(base64, mimeType);
  };

  const handleRetry = () => {
    if (lastCompressedBase64) {
      analyzeImage(lastCompressedBase64, lastMimeType);
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

      // Safely inspect response to prevent "Unexpected token 'T', 'The page c'... is not valid JSON"
      const contentType = response.headers.get('content-type') || '';
      let data: any = null;
      let rawText = '';

      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch {
          data = null;
        }
      } else {
        try {
          rawText = await response.text();
        } catch {
          rawText = '';
        }
      }

      if (!response.ok) {
        if (data && data.error) {
          throw new Error(data.error);
        }
        if (response.status === 404) {
          throw new Error('APIサーバー（/api/analyze-screenshot）が見つかりません (404)。下の入力欄から直接数値を入力してください。');
        }
        throw new Error(`サーバーとの通信でエラーが発生しました (HTTP ${response.status})。下の入力欄から直接数値を入力してください。`);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || '画像の解析に失敗しました。数値を手動で入力してください。');
      }

      const targetVal = Number(data.target);
      const cardsVal = Array.isArray(data.cards)
        ? data.cards.map(Number).filter((n) => !isNaN(n) && n > 0)
        : [];

      if (!targetVal || isNaN(targetVal) || targetVal <= 0 || cardsVal.length < 5) {
        throw new Error(
          data?.error || '画像から数値を認識できませんでした。下の入力欄から直接数値を入力してください。'
        );
      }

      setDetectionSuccess(true);
      setDetectionNotes(data.notes || `TARGET: ${targetVal}, カード: [${cardsVal.slice(0, 5).join(', ')}] を認識しました。`);
      onDataDetected(targetVal, cardsVal.slice(0, 5), base64Url);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || '画像の読み取りに失敗しました。下の入力欄から直接数値を入力してください。');
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

  return (
    <div className="space-y-3">
      {/* Upload Dropzone: Native label and overlay input for full Windows Edge compatibility */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all flex flex-col items-center justify-center min-h-[170px] ${
          dragActive
            ? 'border-blue-500 bg-blue-50/70'
            : imagePreview
            ? 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'
            : 'border-slate-300 hover:border-blue-400 bg-white hover:bg-slate-50/60'
        }`}
      >
        {/* Transparent native file input covering the entire dropzone area */}
        <input
          id="screenshot-file-input"
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/*"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          onChange={handleFileInput}
          title="クリックして画像ファイルを選択"
          disabled={isAnalyzing}
        />

        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center space-y-2 py-4 pointer-events-none">
            <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
            <span className="text-sm font-semibold text-slate-800">
              画像を解析中...
            </span>
          </div>
        ) : imagePreview ? (
          <div className="flex flex-col items-center justify-center w-full pointer-events-none">
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
            <span className="text-[11px] text-blue-600 font-medium">クリックして別の画像に変更</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2 py-2 pointer-events-none">
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
            <div className="pt-1">
              <span className="inline-flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded border border-slate-200 font-medium">
                <FileImage className="w-3.5 h-3.5 text-slate-500" />
                ファイルを選択
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Clear image button if an image is loaded */}
      {imagePreview && (
        <div className="flex justify-end">
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
            画像をクリア
          </button>
        </div>
      )}

      {/* Status Banners */}
      {detectionSuccess && (
        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">数値を認識しました</span>
        </div>
      )}

      {error && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start justify-between gap-2 text-xs text-amber-900">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-amber-900 font-medium leading-relaxed">{error}</p>
          </div>
          {imagePreview && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={isAnalyzing}
              className="shrink-0 flex items-center gap-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 font-semibold px-2 py-0.5 rounded shadow-xs transition-colors"
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
