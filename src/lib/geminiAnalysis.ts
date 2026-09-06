import { GoogleGenAI, Type } from '@google/genai';

// Supported default models if GEMINI_MODEL is not set
const DEFAULT_MODELS = ['gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface AnalysisResult {
  target: number;
  cards: number[];
  notes: string;
}

export async function analyzeScreenshotWithGemini(
  apiKey: string,
  imageBase64: string,
  mimeType: string = 'image/png',
  modelNameOverride?: string
): Promise<AnalysisResult> {
  const cleanApiKey = apiKey.trim().replace(/^["']|["']$/g, '');
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');
  const ai = new GoogleGenAI({ apiKey: cleanApiKey });

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

  const envModel = (typeof process !== 'undefined' && process.env?.GEMINI_MODEL ? process.env.GEMINI_MODEL : '').trim().replace(/^["']|["']$/g, '');
  const preferredModel = modelNameOverride || envModel;
  const modelsToTry = preferredModel
    ? [preferredModel, ...DEFAULT_MODELS.filter((m) => m !== preferredModel)]
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
    throw lastError || new Error('Failed to analyze image with candidate Gemini models.');
  }

  return {
    target: parsed.target ?? 31,
    cards: Array.isArray(parsed.cards) ? parsed.cards.slice(0, 5) : [6, 1, 1, 4, 5],
    notes: parsed.notes || '',
  };
}
