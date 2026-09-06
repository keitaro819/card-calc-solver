import { GoogleGenAI, Type } from '@google/genai';

// Supported default models if GEMINI_MODEL is not set
const DEFAULT_MODELS = ['gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const rawKey = process.env.GEMINI_API_KEY || '';
  const apiKey = rawKey.trim().replace(/^["']|["']$/g, '');

  if (!apiKey) {
    console.error('GEMINI_API_KEY is not defined in process.env');
    return res.status(503).json({
      success: false,
      error:
        'GEMINI_API_KEY が読み込めませんでした。Vercelの「Settings > Environment Variables」に正しく登録され、最新のデプロイに反映（Redeploy）されているかご確認ください。',
    });
  }

  try {
    let body = req.body;
    if (Buffer.isBuffer(body)) {
      try {
        body = JSON.parse(body.toString('utf-8'));
      } catch {
        body = {};
      }
    } else if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { imageBase64, mimeType = 'image/png' } = body || {};
    if (!imageBase64) {
      return res.status(400).json({ success: false, error: '画像データ（imageBase64）が送信されていません。' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');
    const ai = new GoogleGenAI({ apiKey });

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

    const userModel = (process.env.GEMINI_MODEL || '').trim().replace(/^["']|["']$/g, '');
    const modelsToTry = userModel
      ? [userModel, ...DEFAULT_MODELS.filter((m) => m !== userModel)]
      : DEFAULT_MODELS;

    for (const modelName of modelsToTry) {
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
          break;
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
            break;
          }
        }
      }

      if (parsed) break;
    }

    if (!parsed) {
      const errMsg = lastError?.message || '';
      console.error('All AI models failed:', errMsg);
      if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid')) {
        return res.status(401).json({
          success: false,
          error: '設定された GEMINI_API_KEY が無効です。Google AI Studioで正しいキーをご確認ください。',
        });
      }
      if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429') || errMsg.includes('quota')) {
        return res.status(429).json({
          success: false,
          error: 'Gemini APIの利用上限（クォータ）に達しました。少し待ってから再試行するか、直接数値を入力してください。',
        });
      }
      return res.status(500).json({
        success: false,
        error: '画像の解析に失敗しました。下の入力欄から直接数値を入力してください。',
      });
    }

    return res.status(200).json({
      success: true,
      target: parsed.target ?? 31,
      cards: Array.isArray(parsed.cards) ? parsed.cards.slice(0, 5) : [6, 1, 1, 4, 5],
      notes: parsed.notes || '',
    });
  } catch (error: any) {
    console.error('Error analyzing screenshot in Vercel function:', error);
    const msg = error?.message || '';
    if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
      return res.status(401).json({
        success: false,
        error: '設定された GEMINI_API_KEY が無効です。Google AI Studioで正しいキーをご確認ください。',
      });
    }
    return res.status(500).json({
      success: false,
      error: '画像の読み取りに失敗しました。下の入力欄から直接数値を入力してください。',
    });
  }
}
