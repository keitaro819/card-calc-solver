import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeScreenshotWithGemini } from './src/lib/geminiAnalysis.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Support base64 image uploads
app.use(express.json({ limit: '25mb' }));

// API: Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API: Analyze screenshot with Gemini Vision with fallback models & retry
app.post('/api/analyze-screenshot', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        error: '画像の自動読み取りは現在ご利用いただけません。下の入力欄から数値を直接ご入力ください。',
      });
    }

    const { imageBase64, mimeType = 'image/png' } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({ success: false, error: '画像データ（imageBase64）が指定されていません。' });
    }

    const result = await analyzeScreenshotWithGemini(apiKey, imageBase64, mimeType);

    return res.json({
      success: true,
      target: result.target,
      cards: result.cards,
      notes: result.notes,
    });
  } catch (error: any) {
    console.error('Error analyzing screenshot:', error);
    const msg = error?.message || 'Failed to analyze screenshot image with Gemini AI';
    const friendlyMsg =
      msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')
        ? '現在AIサーバーが一時的に混み合っています。少し待って再試行するか、下の入力欄から数値を直接ご入力ください。'
        : msg;

    return res.status(500).json({
      success: false,
      error: friendlyMsg,
    });
  }
});

async function startServer() {
  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
