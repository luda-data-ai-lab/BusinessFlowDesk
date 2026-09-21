import type { CSSProperties } from 'react';
import type { FlowNodeData } from '../../../types/flow';
import { NODE_TYPE_MAP } from '../../../constants/nodeTypes';

export function nodeColor(data: FlowNodeData): string {
  return data.color || NODE_TYPE_MAP[data.nodeType].color;
}

/** Blends a hex colour with white/black for backgrounds that stay readable in both themes. */
export function tint(hex: string, alpha: number): string {
  const m = hex.replace('#', '');
  const n = parseInt(
    m.length === 3
      ? m
          .split('')
          .map((c) => c + c)
          .join('')
      : m,
    16,
  );
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function selectionRing(selected: boolean | undefined, color: string): CSSProperties {
  return selected
    ? { boxShadow: `0 0 0 3px ${tint(color, 0.35)}, 0 8px 24px -8px ${tint(color, 0.5)}` }
    : {};
}
