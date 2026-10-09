import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleGenerate } from './_handler';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const raw = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const result = await handleGenerate(raw, {
      CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
      CLAUDE_MODEL: process.env.CLAUDE_MODEL,
      DATABASE_URL: process.env.DATABASE_URL,
    });
    res.status(result.status).json(result.body);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    res.status(500).json({ error: message });
  }
}
