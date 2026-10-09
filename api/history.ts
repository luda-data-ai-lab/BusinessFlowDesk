import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleHistory } from './_history';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const result = await handleHistory(req.method ?? 'GET', url.searchParams, {
    CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
    CLAUDE_MODEL: process.env.CLAUDE_MODEL,
    DATABASE_URL: process.env.DATABASE_URL,
  });
  res.status(result.status).json(result.body);
}
