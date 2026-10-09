import { Pool } from 'pg';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export type CallKind = 'generate' | 'diagnose';

export interface CallRecord {
  kind: CallKind;
  status: number;
  mock: boolean;
  model?: string;
  role?: string;
  language?: string;
  prompt?: string;
  request: unknown;
  response?: unknown;
  error?: string;
  durationMs: number;
}

export interface HistoryItem {
  id: number;
  kind: CallKind;
  status: number;
  mock: boolean;
  model: string | null;
  role: string | null;
  language: string | null;
  prompt: string | null;
  title: string | null;
  error: string | null;
  durationMs: number | null;
  createdAt: string;
}

let pool: Pool | null = null;
let poolUrl = '';
let schemaReady: Promise<void> | null = null;

function schemaSql(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, '..', 'db', 'schema.sql'), 'utf8');
}

export function getPool(databaseUrl?: string): Pool | null {
  const url = databaseUrl?.trim();
  if (!url) return null;
  if (!pool || poolUrl !== url) {
    pool = new Pool({
      connectionString: url,
      max: 3,
      ssl: /sslmode=require/.test(url) ? { rejectUnauthorized: false } : undefined,
    });
    pool.on('error', (err) => console.error('[db] pool error:', err.message));
    poolUrl = url;
    schemaReady = null;
  }
  return pool;
}

export async function ensureSchema(databaseUrl?: string): Promise<Pool | null> {
  const p = getPool(databaseUrl);
  if (!p) return null;
  if (!schemaReady) {
    schemaReady = p.query(schemaSql()).then(() => undefined);
    schemaReady.catch(() => {
      schemaReady = null;
    });
  }
  await schemaReady;
  return p;
}

/** Fire-and-forget: never throws, never blocks the API response. */
export function recordCall(databaseUrl: string | undefined, rec: CallRecord): Promise<void> {
  return ensureSchema(databaseUrl)
    .then((p) => {
      if (!p) return;
      return p
        .query(
          `INSERT INTO ai_calls
             (kind, status, mock, model, role, language, prompt, request, response, error, duration_ms)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11)`,
          [
            rec.kind,
            rec.status,
            rec.mock,
            rec.model ?? null,
            rec.role ?? null,
            rec.language ?? null,
            rec.prompt?.slice(0, 4000) ?? null,
            JSON.stringify(rec.request ?? null),
            rec.response === undefined ? null : JSON.stringify(rec.response),
            rec.error ?? null,
            rec.durationMs,
          ],
        )
        .then(() => undefined);
    })
    .catch((err: unknown) => {
      console.error('[db] failed to record call:', err instanceof Error ? err.message : err);
    });
}

export async function listHistory(
  databaseUrl: string | undefined,
  opts: { kind?: CallKind; limit?: number } = {},
): Promise<HistoryItem[] | null> {
  const p = await ensureSchema(databaseUrl);
  if (!p) return null;
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const params: unknown[] = [limit];
  let where = '';
  if (opts.kind) {
    params.push(opts.kind);
    where = 'WHERE kind = $2';
  }
  const { rows } = await p.query<{
    id: string;
    kind: CallKind;
    status: number;
    mock: boolean;
    model: string | null;
    role: string | null;
    language: string | null;
    prompt: string | null;
    title: string | null;
    error: string | null;
    duration_ms: number | null;
    created_at: Date;
  }>(
    `SELECT id, kind, status, mock, model, role, language, prompt,
            COALESCE(response->'flow'->>'title', request->'flow'->>'title') AS title,
            error, duration_ms, created_at
       FROM ai_calls ${where}
      ORDER BY created_at DESC
      LIMIT $1`,
    params,
  );
  return rows.map((r) => ({
    id: Number(r.id),
    kind: r.kind,
    status: r.status,
    mock: r.mock,
    model: r.model,
    role: r.role,
    language: r.language,
    prompt: r.prompt,
    title: r.title,
    error: r.error,
    durationMs: r.duration_ms,
    createdAt: r.created_at.toISOString(),
  }));
}

export async function getHistoryItem(
  databaseUrl: string | undefined,
  id: number,
): Promise<{ request: unknown; response: unknown } | null> {
  const p = await ensureSchema(databaseUrl);
  if (!p || !Number.isFinite(id)) return null;
  const { rows } = await p.query<{ request: unknown; response: unknown }>(
    'SELECT request, response FROM ai_calls WHERE id = $1',
    [id],
  );
  return rows[0] ?? null;
}
