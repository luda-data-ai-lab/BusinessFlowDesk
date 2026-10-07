export type InterfaceMethod = 'rest' | 'soap' | 'batch' | 'file' | 'db' | 'mq' | 'manual' | 'other';
export type InterfaceFrequency =
  'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'ondemand' | 'other';

export const INTERFACE_METHODS: InterfaceMethod[] = [
  'rest',
  'soap',
  'batch',
  'file',
  'db',
  'mq',
  'manual',
  'other',
];

export const INTERFACE_FREQUENCIES: InterfaceFrequency[] = [
  'realtime',
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'ondemand',
  'other',
];

/**
 * A system-to-system interface registered in the catalog (shared across all flows in this
 * browser). Edges reference it by `code` so project JSON / share links stay self-describing.
 */
export interface BusinessInterface {
  id: string;
  /** Short identifier shown on edges, e.g. "IF-001". Unique (case-insensitive). */
  code: string;
  name?: string;
  /** System names (catalog names when registered, free text otherwise). */
  source: string;
  target: string;
  method: InterfaceMethod;
  frequency: InterfaceFrequency;
  description?: string;
}
