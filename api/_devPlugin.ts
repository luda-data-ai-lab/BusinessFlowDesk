import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { loadEnv } from 'vite';
import { handleDiagnose, handleGenerate } from './_handler';

/**
 * Serves /api/generate and /api/diagnose during `vite dev` (and `vite preview`) using the same handler
 * that runs on Vercel, so the dev experience matches production.
 */
export function devApiPlugin(): Plugin {
  let env: Record<string, string> = {};

  const middleware = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const isGenerate = req.url?.startsWith('/api/generate');
    const isDiagnose = req.url?.startsWith('/api/diagnose');
    if (!isGenerate && !isDiagnose) return next();
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    let raw: unknown = null;
    try {
      raw = JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null');
    } catch {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      return;
    }
    try {
      const keys = {
        CLAUDE_API_KEY: env.CLAUDE_API_KEY ?? process.env.CLAUDE_API_KEY,
        CLAUDE_MODEL: env.CLAUDE_MODEL ?? process.env.CLAUDE_MODEL,
      };
      const result = isDiagnose ? await handleDiagnose(raw, keys) : await handleGenerate(raw, keys);
      res.statusCode = result.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(result.body));
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unexpected error' }));
    }
  };

  return {
    name: 'bfd-dev-api',
    configResolved(config) {
      env = loadEnv(config.mode, config.envDir ?? process.cwd(), '');
    },
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
