import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCatalog } from './_store';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const env = {
    CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
    CLAUDE_MODEL: process.env.CLAUDE_MODEL,
    DATABASE_URL: process.env.DATABASE_URL,
  };
  let raw: unknown = null;
  try {
    raw = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? null);
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }
  const result = await handleCatalog(req.method ?? 'GET', raw, env);
  res.status(result.status).json(result.body);
}
