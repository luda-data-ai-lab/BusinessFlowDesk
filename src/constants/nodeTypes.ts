import type { NodeType } from '../types/flow';

export interface NodeTypeDefinition {
  type: NodeType;
  label: { ko: string; en: string };
  icon: string;
  color: string;
  category: 'basic' | 'advanced';
  width: number;
  height: number;
}

export const NODE_TYPES: NodeTypeDefinition[] = [
  {
    type: 'start',
    label: { ko: '시작', en: 'Start' },
    icon: '●',
    color: '#22C55E',
    category: 'basic',
    width: 88,
    height: 88,
  },
  {
    type: 'end',
    label: { ko: '종료', en: 'End' },
    icon: '◎',
    color: '#EF4444',
    category: 'basic',
    width: 88,
    height: 88,
  },
  {
    type: 'task',
    label: { ko: '업무', en: 'Task' },
    icon: '□',
    color: '#3B82F6',
    category: 'basic',
    width: 200,
    height: 84,
  },
  {
    type: 'decision',
    label: { ko: '분기', en: 'Decision' },
    icon: '◇',
    color: '#F59E0B',
    category: 'basic',
    width: 150,
    height: 150,
  },
  {
    type: 'subprocess',
    label: { ko: '하위 프로세스', en: 'Subprocess' },
    icon: '⊞',
    color: '#8B5CF6',
    category: 'advanced',
    width: 200,
    height: 84,
  },
  {
    type: 'system',
    label: { ko: '시스템', en: 'System' },
    icon: '⬡',
    color: '#06B6D4',
    category: 'advanced',
    width: 200,
    height: 84,
  },
  {
    type: 'data',
    label: { ko: '데이터', en: 'Data' },
    icon: '▱',
    color: '#0EA5E9',
    category: 'advanced',
    width: 200,
    height: 72,
  },
  {
    type: 'timer',
    label: { ko: '대기', en: 'Timer' },
    icon: '⏱',
    color: '#F97316',
    category: 'advanced',
    width: 160,
    height: 72,
  },
  {
    type: 'parallel',
    label: { ko: '병렬', en: 'Parallel' },
    icon: '═',
    color: '#64748B',
    category: 'advanced',
    width: 120,
    height: 120,
  },
  {
    type: 'annotation',
    label: { ko: '메모', en: 'Note' },
    icon: '💬',
    color: '#94A3B8',
    category: 'advanced',
    width: 200,
    height: 72,
  },
];

export const NODE_TYPE_MAP: Record<NodeType, NodeTypeDefinition> = Object.fromEntries(
  NODE_TYPES.map((n) => [n.type, n]),
) as Record<NodeType, NodeTypeDefinition>;

export const NODE_TYPE_IDS = NODE_TYPES.map((n) => n.type);

export function isNodeType(value: string): value is NodeType {
  return (NODE_TYPE_IDS as string[]).includes(value);
}

export function nodeSize(type: NodeType): { width: number; height: number } {
  const def = NODE_TYPE_MAP[type];
  return { width: def.width, height: def.height };
}
