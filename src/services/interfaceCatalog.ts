import {
  INTERFACE_FREQUENCIES,
  INTERFACE_METHODS,
  type BusinessInterface,
} from '../types/interface';
import type { FlowEdge, FlowNode } from '../types/flow';

export const INTERFACES_KEY = 'bfd_interfaces';
export const MAX_INTERFACES = 200;
export const MAX_INTERFACE_CODE = 30;

function isInterface(v: unknown): v is BusinessInterface {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.code === 'string' &&
    typeof o.source === 'string' &&
    typeof o.target === 'string'
  );
}

export function loadInterfaces(): BusinessInterface[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(INTERFACES_KEY) ?? '[]') as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.filter(isInterface).map((i) => ({
      ...i,
      method: INTERFACE_METHODS.includes(i.method) ? i.method : 'other',
      frequency: INTERFACE_FREQUENCIES.includes(i.frequency) ? i.frequency : 'other',
    }));
  } catch {
    return [];
  }
}

export function saveInterfaces(interfaces: BusinessInterface[]) {
  try {
    localStorage.setItem(INTERFACES_KEY, JSON.stringify(interfaces));
  } catch (err) {
    console.warn('[bfd] localStorage write failed (interfaces)', err);
  }
}

export function newInterfaceId(): string {
  return `if_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Next free "IF-NNN" code. */
export function nextInterfaceCode(existing: BusinessInterface[]): string {
  const used = new Set(existing.map((i) => i.code.toLowerCase()));
  for (let n = 1; n < 10000; n++) {
    const code = `IF-${String(n).padStart(3, '0')}`;
    if (!used.has(code.toLowerCase())) return code;
  }
  return `IF-${Date.now().toString(36)}`;
}

const norm = (s?: string) => s?.trim().toLowerCase() ?? '';

export function findInterface(
  interfaces: BusinessInterface[],
  code?: string,
): BusinessInterface | undefined {
  const key = norm(code);
  if (!key) return undefined;
  return interfaces.find((i) => norm(i.code) === key);
}

/** Interfaces connecting `from` → `to`; exact direction first, reverse direction after. */
export function interfacesBetween(
  interfaces: BusinessInterface[],
  from?: string,
  to?: string,
): BusinessInterface[] {
  const a = norm(from);
  const b = norm(to);
  if (!a || !b) return [];
  const forward = interfaces.filter((i) => norm(i.source) === a && norm(i.target) === b);
  const reverse = interfaces.filter((i) => norm(i.source) === b && norm(i.target) === a);
  return [...forward, ...reverse];
}

export interface Boundary {
  edge: FlowEdge;
  from: string;
  to: string;
  /** Interface code mapped on the edge, if any. */
  code?: string;
  interface?: BusinessInterface;
}

/** Edges whose source and target steps run in different (non-empty) systems. */
export function systemBoundaries(
  nodes: FlowNode[],
  edges: FlowEdge[],
  interfaces: BusinessInterface[] = [],
): Boundary[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out: Boundary[] = [];
  for (const e of edges) {
    const from = byId.get(e.source)?.data.system?.trim();
    const to = byId.get(e.target)?.data.system?.trim();
    if (!from || !to || norm(from) === norm(to)) continue;
    const code = e.data?.interface?.trim() || undefined;
    out.push({ edge: e, from, to, code, interface: findInterface(interfaces, code) });
  }
  return out;
}
