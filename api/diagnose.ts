import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleDiagnose } from './_handler';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const raw = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const result = await handleDiagnose(raw, {
      CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
      CLAUDE_MODEL: process.env.CLAUDE_MODEL,
    });
    res.status(result.status).json(result.body);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    res.status(500).json({ error: message });
  }
}
