import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { loadEnv } from 'vite';
import { handleDiagnose, handleGenerate } from './_handler';
import { handleHistory } from './_history';
import { handleCatalog, handleFlows } from './_store';

/**
 * Serves /api/generate, /api/diagnose, /api/history, /api/flows and /api/catalog during `vite dev` (and `vite preview`) using the same handler
 * that runs on Vercel, so the dev experience matches production.
 */
export function devApiPlugin(): Plugin {
  let env: Record<string, string> = {};

  const middleware = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const isGenerate = req.url?.startsWith('/api/generate');
    const isDiagnose = req.url?.startsWith('/api/diagnose');
    const isHistory = req.url?.startsWith('/api/history');
    const isFlows = req.url?.startsWith('/api/flows');
    const isCatalog = req.url?.startsWith('/api/catalog');
    if (!isGenerate && !isDiagnose && !isHistory && !isFlows && !isCatalog) return next();
    const keys = {
      CLAUDE_API_KEY: env.CLAUDE_API_KEY ?? process.env.CLAUDE_API_KEY,
      CLAUDE_MODEL: env.CLAUDE_MODEL ?? process.env.CLAUDE_MODEL,
      DATABASE_URL: env.DATABASE_URL ?? process.env.DATABASE_URL,
    };
    if (isHistory) {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const result = await handleHistory(req.method ?? 'GET', url.searchParams, keys);
      res.statusCode = result.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(result.body));
      return;
    }
    const method = req.method ?? 'GET';
    if (isFlows || isCatalog) {
      let raw: unknown = null;
      if (method !== 'GET' && method !== 'DELETE') {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        try {
          raw = JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null');
        } catch {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Invalid JSON body' }));
          return;
        }
      }
      const url = new URL(req.url ?? '/', 'http://localhost');
      const result = isFlows
        ? await handleFlows(method, url.searchParams, raw, keys)
        : await handleCatalog(method, raw, keys);
      res.statusCode = result.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(result.body));
      return;
    }
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
