import { getHistoryItem, listHistory, type CallKind, type HistoryItem } from './_db';
import type { HandlerEnv } from './_handler';

export interface HistoryResult {
  status: number;
  body:
    | { enabled: false; items: [] }
    | { enabled: true; items: HistoryItem[] }
    | { request: unknown; response: unknown }
    | { error: string };
}

/** GET /api/history?kind=generate|diagnose&limit=50  |  GET /api/history?id=123 */
export async function handleHistory(
  method: string,
  params: URLSearchParams,
  env: HandlerEnv,
): Promise<HistoryResult> {
  if (method !== 'GET') return { status: 405, body: { error: 'Method not allowed' } };
  if (!env.DATABASE_URL?.trim()) return { status: 200, body: { enabled: false, items: [] } };
  try {
    const id = params.get('id');
    if (id) {
      const item = await getHistoryItem(env.DATABASE_URL, Number(id));
      return item ? { status: 200, body: item } : { status: 404, body: { error: 'Not found' } };
    }
    const kindParam = params.get('kind');
    const kind: CallKind | undefined =
      kindParam === 'generate' || kindParam === 'diagnose' ? kindParam : undefined;
    const limit = Number(params.get('limit') ?? '50');
    const items = (await listHistory(env.DATABASE_URL, { kind, limit })) ?? [];
    return { status: 200, body: { enabled: true, items } };
  } catch (err) {
    return {
      status: 500,
      body: { error: err instanceof Error ? err.message : 'Database error' },
    };
  }
}
