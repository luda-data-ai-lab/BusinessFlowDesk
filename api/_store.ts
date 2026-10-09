import { ensureSchema } from './_db';
import type { HandlerEnv } from './_handler';

export interface ServerFlowSummary {
  id: string;
  title: string;
  role: string | null;
  nodeCount: number;
  updatedAt: string;
}

export interface ApiResult {
  status: number;
  body: unknown;
}

const MAX_FLOW_BYTES = 2_000_000;
const MAX_CATALOG_BYTES = 1_000_000;
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

const disabled = (): ApiResult => ({ status: 200, body: { enabled: false } });
const err = (status: number, error: string): ApiResult => ({ status, body: { error } });

function isFlowProject(v: unknown): v is {
  id: string;
  title?: string;
  role?: string;
  nodes: unknown[];
  edges: unknown[];
} {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'string' && ID_RE.test(o.id) && Array.isArray(o.nodes) && Array.isArray(o.edges)
  );
}

/**
 * GET    /api/flows            → { enabled, items: ServerFlowSummary[] }
 * GET    /api/flows?id=        → FlowProject
 * PUT    /api/flows  (body)    → upsert FlowProject (id from body)
 * DELETE /api/flows?id=        → { ok: true }
 */
export async function handleFlows(
  method: string,
  params: URLSearchParams,
  raw: unknown,
  env: HandlerEnv,
): Promise<ApiResult> {
  if (!env.DATABASE_URL?.trim()) return disabled();
  try {
    const p = await ensureSchema(env.DATABASE_URL);
    if (!p) return disabled();
    const id = params.get('id');
    if (method === 'GET') {
      if (id) {
        const { rows } = await p.query<{ data: unknown }>('SELECT data FROM flows WHERE id = $1', [
          id,
        ]);
        return rows[0] ? { status: 200, body: rows[0].data } : err(404, 'Not found');
      }
      const { rows } = await p.query<{
        id: string;
        title: string;
        role: string | null;
        node_count: number;
        updated_at: Date;
      }>(
        'SELECT id, title, role, node_count, updated_at FROM flows ORDER BY updated_at DESC LIMIT 200',
      );
      const items: ServerFlowSummary[] = rows.map((r) => ({
        id: r.id,
        title: r.title,
        role: r.role,
        nodeCount: r.node_count,
        updatedAt: r.updated_at.toISOString(),
      }));
      return { status: 200, body: { enabled: true, items } };
    }
    if (method === 'PUT' || method === 'POST') {
      if (!isFlowProject(raw)) return err(400, 'Body must be a flow project with id/nodes/edges');
      const json = JSON.stringify(raw);
      if (json.length > MAX_FLOW_BYTES) return err(413, 'Flow is too large');
      const title = typeof raw.title === 'string' ? raw.title.slice(0, 200) : '';
      const role = typeof raw.role === 'string' ? raw.role.slice(0, 40) : null;
      const { rows } = await p.query<{ updated_at: Date }>(
        `INSERT INTO flows (id, title, role, node_count, data)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         ON CONFLICT (id) DO UPDATE
           SET title = EXCLUDED.title, role = EXCLUDED.role, node_count = EXCLUDED.node_count,
               data = EXCLUDED.data, updated_at = now()
         RETURNING updated_at`,
        [raw.id, title, role, raw.nodes.length, json],
      );
      return { status: 200, body: { ok: true, id: raw.id, updatedAt: rows[0].updated_at } };
    }
    if (method === 'DELETE') {
      if (!id || !ID_RE.test(id)) return err(400, '`id` is required');
      await p.query('DELETE FROM flows WHERE id = $1', [id]);
      return { status: 200, body: { ok: true } };
    }
    return err(405, 'Method not allowed');
  } catch (e) {
    return err(500, e instanceof Error ? e.message : 'Database error');
  }
}

/**
 * GET /api/catalog         → { enabled, systems, interfaces, updatedAt }
 * PUT /api/catalog (body)  → { systems?: [], interfaces?: [] } replaces the given keys
 */
export async function handleCatalog(
  method: string,
  raw: unknown,
  env: HandlerEnv,
): Promise<ApiResult> {
  if (!env.DATABASE_URL?.trim()) return disabled();
  try {
    const p = await ensureSchema(env.DATABASE_URL);
    if (!p) return disabled();
    if (method === 'GET') {
      const { rows } = await p.query<{ key: string; data: unknown; updated_at: Date }>(
        'SELECT key, data, updated_at FROM catalog',
      );
      const byKey = Object.fromEntries(rows.map((r) => [r.key, r.data]));
      const updated = rows.map((r) => r.updated_at.getTime());
      return {
        status: 200,
        body: {
          enabled: true,
          systems: Array.isArray(byKey.systems) ? byKey.systems : [],
          interfaces: Array.isArray(byKey.interfaces) ? byKey.interfaces : [],
          updatedAt: updated.length ? new Date(Math.max(...updated)).toISOString() : null,
        },
      };
    }
    if (method === 'PUT' || method === 'POST') {
      if (!raw || typeof raw !== 'object') return err(400, 'Body must be a JSON object');
      const body = raw as Record<string, unknown>;
      let written = 0;
      for (const key of ['systems', 'interfaces'] as const) {
        if (!Array.isArray(body[key])) continue;
        const json = JSON.stringify(body[key]);
        if (json.length > MAX_CATALOG_BYTES) return err(413, `${key} is too large`);
        await p.query(
          `INSERT INTO catalog (key, data) VALUES ($1, $2::jsonb)
           ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
          [key, json],
        );
        written++;
      }
      if (!written) return err(400, 'Provide `systems` and/or `interfaces` arrays');
      return { status: 200, body: { ok: true } };
    }
    return err(405, 'Method not allowed');
  } catch (e) {
    return err(500, e instanceof Error ? e.message : 'Database error');
  }
}
