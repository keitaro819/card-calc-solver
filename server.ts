import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Support base64 image uploads
app.use(express.json({ limit: '25mb' }));

// Lazy init Gemini AI
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in the environment.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// API: Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Candidate models in order of resilience and capacity
const CANDIDATE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-flash-latest',
];

// Helper delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// API: Analyze screenshot with Gemini Vision with fallback models & retry
app.post('/api/analyze-screenshot', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/png' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    // Clean base64 string if it contains prefix like data:image/png;base64,
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');

    const ai = getAIClient();

    const prompt = `You are an expert game screen recognition AI.
Analyze this card arithmetic puzzle screenshot.
Extract:
1. The target number (labelled as "TARGET" or shown in a prominent target shield/banner, usually at the top).
2. The numbers on the cards in the playing field. There should typically be 5 cards.

Return strictly a JSON object with:
- "target": integer (e.g. 31)
- "cards": array of integers (e.g. [6, 1, 1, 4, 5])
- "notes": short explanation or description of the detected numbers
`;

    let lastError: any = null;
    let parsed: any = null;

    // Try candidate models with fallback
    for (const modelName of CANDIDATE_MODELS) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: cleanBase64,
                    },
                  },
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  target: { type: Type.INTEGER, description: 'Target integer value' },
                  cards: {
                    type: Type.ARRAY,
                    items: { type: Type.INTEGER },
                    description: 'The 5 card integer values',
                  },
                  notes: { type: Type.STRING, description: 'Brief observation' },
                },
                required: ['target', 'cards'],
              },
            },
          });

          const responseText = response.text || '{}';
          parsed = JSON.parse(responseText);
          break; // Success with this model
        } catch (err: any) {
          lastError = err;
          console.warn(`Model ${modelName} attempt ${attempt} failed:`, err?.message || err);
          const isUnavailable =
            err?.message?.includes('503') ||
            err?.message?.includes('UNAVAILABLE') ||
            err?.message?.includes('high demand') ||
            err?.message?.includes('429') ||
            err?.message?.includes('RESOURCE_EXHAUSTED');

          if (isUnavailable && attempt < 2) {
            await sleep(1000 * attempt);
            continue;
          } else {
            break; // Try next candidate model
          }
        }
      }

      if (parsed) {
        break; // Successfully got parsed result
      }
    }

    if (!parsed) {
      throw lastError || new Error('All AI models are currently experiencing high demand. Please try again or input numbers manually.');
    }

    return res.json({
      success: true,
      target: parsed.target ?? 31,
      cards: Array.isArray(parsed.cards) ? parsed.cards.slice(0, 5) : [6, 1, 1, 4, 5],
      notes: parsed.notes || '',
    });
  } catch (error: any) {
    console.error('Error analyzing screenshot:', error);
    const msg = error?.message || 'Failed to analyze screenshot image with Gemini AI';
    const friendlyMsg = msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')
      ? '現在AIサーバーが一時的に混み合っています。少し待って再試行するか、下の入力欄から数値を直接ご入力ください。'
      : msg;

    return res.status(500).json({
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
