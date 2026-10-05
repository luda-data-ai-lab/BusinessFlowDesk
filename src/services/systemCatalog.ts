import { SYSTEM_CATEGORIES, SYSTEM_COLORS, type BusinessSystem } from '../types/system';

export const SYSTEMS_KEY = 'bfd_systems';
export const MAX_SYSTEMS = 50;
export const MAX_SYSTEM_NAME = 60;

function isSystem(v: unknown): v is BusinessSystem {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.name === 'string' && typeof o.color === 'string';
}

export function loadSystems(): BusinessSystem[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(SYSTEMS_KEY) ?? '[]') as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.filter(isSystem).map((s) => ({
      ...s,
      category: SYSTEM_CATEGORIES.includes(s.category) ? s.category : 'other',
    }));
  } catch {
    return [];
  }
}

export function saveSystems(systems: BusinessSystem[]) {
  try {
    localStorage.setItem(SYSTEMS_KEY, JSON.stringify(systems));
  } catch (err) {
    console.warn('[bfd] localStorage write failed (systems)', err);
  }
}

export function nextSystemColor(existing: BusinessSystem[]): string {
  const used = new Set(existing.map((s) => s.color));
  return (
    SYSTEM_COLORS.find((c) => !used.has(c)) ?? SYSTEM_COLORS[existing.length % SYSTEM_COLORS.length]
  );
}

export function newSystemId(): string {
  return `sys_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Case-insensitive lookup by name. */
export function findSystem(systems: BusinessSystem[], name?: string): BusinessSystem | undefined {
  const key = name?.trim().toLowerCase();
  if (!key) return undefined;
  return systems.find((s) => s.name.trim().toLowerCase() === key);
}

/** Map a free-text system name to the registered canonical name (keeps unknown names as-is). */
export function canonicalSystemName(systems: BusinessSystem[], name?: string): string | undefined {
  const trimmed = name?.trim();
  if (!trimmed) return undefined;
  return findSystem(systems, trimmed)?.name ?? trimmed;
}
