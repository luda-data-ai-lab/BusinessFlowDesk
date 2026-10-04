export type SystemCategory = 'internal' | 'external' | 'saas' | 'legacy' | 'other';

export const SYSTEM_CATEGORIES: SystemCategory[] = [
  'internal',
  'external',
  'saas',
  'legacy',
  'other',
];

/** A business system registered in the catalog (shared across all flows in this browser). */
export interface BusinessSystem {
  id: string;
  name: string;
  category: SystemCategory;
  description?: string;
  owner?: string;
  color: string;
}

export const SYSTEM_COLORS = [
  '#2563EB',
  '#7C3AED',
  '#0891B2',
  '#D97706',
  '#DB2777',
  '#059669',
  '#DC2626',
  '#64748B',
];
