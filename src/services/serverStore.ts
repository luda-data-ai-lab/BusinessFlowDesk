import type { FlowProject } from '../types/flow';
import type { BusinessSystem } from '../types/system';
import type { BusinessInterface } from '../types/interface';

export interface ServerFlowSummary {
  id: string;
  title: string;
  role: string | null;
  nodeCount: number;
  updatedAt: string;
}

export interface HistoryItem {
  id: number;
  kind: 'generate' | 'diagnose';
  status: number;
  mock: boolean;
  model: string | null;
  role: string | null;
  prompt: string | null;
  title: string | null;
  error: string | null;
  durationMs: number | null;
  createdAt: string;
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !data) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return data;
}

/** `enabled:false` means the server has no DATABASE_URL (or the API is not deployed). */
export async function fetchServerFlows(): Promise<{
  enabled: boolean;
  items: ServerFlowSummary[];
}> {
  try {
    const data = await call<{ enabled?: boolean; items?: ServerFlowSummary[] }>('/api/flows');
    return { enabled: data.enabled === true, items: data.items ?? [] };
  } catch {
    return { enabled: false, items: [] };
  }
}

export function fetchServerFlow(id: string): Promise<FlowProject> {
  return call<FlowProject>(`/api/flows?id=${encodeURIComponent(id)}`);
}

export function putServerFlow(project: FlowProject): Promise<{ ok: true; updatedAt: string }> {
  return call('/api/flows', { method: 'PUT', body: JSON.stringify(project) });
}

export function deleteServerFlow(id: string): Promise<{ ok: true }> {
  return call(`/api/flows?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function fetchServerCatalog(): Promise<{
  enabled: boolean;
  systems: BusinessSystem[];
  interfaces: BusinessInterface[];
  updatedAt: string | null;
}> {
  return call('/api/catalog');
}

export function putServerCatalog(body: {
  systems: BusinessSystem[];
  interfaces: BusinessInterface[];
}): Promise<{ ok: true }> {
  return call('/api/catalog', { method: 'PUT', body: JSON.stringify(body) });
}

export async function fetchHistory(limit = 50): Promise<HistoryItem[]> {
  const data = await call<{ enabled: boolean; items?: HistoryItem[] }>(
    `/api/history?limit=${limit}`,
  );
  return data.items ?? [];
}

export function fetchHistoryItem(id: number): Promise<{ request: unknown; response: unknown }> {
  return call(`/api/history?id=${id}`);
}
