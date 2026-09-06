import { analyzeScreenshotWithGemini } from '../src/lib/geminiAnalysis.ts';

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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      success: false,
      error: '画像の自動読み取りは現在ご利用いただけません。下の入力欄から数値を直接ご入力ください。',
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // ignore
      }
    }

    const { imageBase64, mimeType = 'image/png' } = body || {};
    if (!imageBase64) {
      return res.status(400).json({ success: false, error: '画像データ（imageBase64）が送信されていません。' });
    }

    const result = await analyzeScreenshotWithGemini(apiKey, imageBase64, mimeType);

    return res.status(200).json({
      success: true,
      target: result.target,
      cards: result.cards,
      notes: result.notes,
    });
  } catch (error: any) {
    console.error('Error analyzing screenshot in Vercel function:', error);
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
}
