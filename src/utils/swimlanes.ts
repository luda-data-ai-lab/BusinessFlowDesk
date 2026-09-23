import type { FlowNode, LayoutDirection } from '../types/flow';
import { nodeSize } from '../constants/nodeTypes';

export const LANE_PADDING = 40;
export const LANE_HEADER = 40;
export const UNASSIGNED_LANE = '';

export interface Lane {
  department: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function laneKey(node: FlowNode): string {
  return node.data.department?.trim() ?? UNASSIGNED_LANE;
}

export function sizeOf(node: FlowNode): { width: number; height: number } {
  return node.measured?.width && node.measured?.height
    ? { width: node.measured.width, height: node.measured.height }
    : nodeSize(node.data.nodeType);
}

/** Lane order: by the average position along the flow's cross axis (first appearance wins ties). */
export function laneOrder(nodes: FlowNode[], direction: LayoutDirection): string[] {
  const sums = new Map<string, { sum: number; count: number; first: number }>();
  nodes.forEach((n, i) => {
    const key = laneKey(n);
    const v = direction === 'TB' ? n.position.x : n.position.y;
    const cur = sums.get(key);
    if (cur) {
      cur.sum += v;
      cur.count += 1;
    } else sums.set(key, { sum: v, count: 1, first: i });
  });
  return [...sums.entries()]
    .sort((a, b) => a[1].sum / a[1].count - b[1].sum / b[1].count || a[1].first - b[1].first)
    .map(([k]) => k);
}

/**
 * Compute lane rectangles from the current node positions. Lanes are stacked along the
 * cross axis (columns for TB, rows for LR) and boundaries between neighbours are placed
 * midway so lanes never overlap even after manual dragging.
 */
export function computeLanes(nodes: FlowNode[], direction: LayoutDirection): Lane[] {
  if (nodes.length === 0) return [];
  const order = laneOrder(nodes, direction);
  const isTB = direction === 'TB';

  let mainMin = Infinity;
  let mainMax = -Infinity;
  const extents = new Map<string, { min: number; max: number }>();
  for (const n of nodes) {
    const { width, height } = sizeOf(n);
    const cross0 = isTB ? n.position.x : n.position.y;
    const cross1 = cross0 + (isTB ? width : height);
    const main0 = isTB ? n.position.y : n.position.x;
    const main1 = main0 + (isTB ? height : width);
    mainMin = Math.min(mainMin, main0);
    mainMax = Math.max(mainMax, main1);
    const key = laneKey(n);
    const ext = extents.get(key);
    if (ext) {
      ext.min = Math.min(ext.min, cross0);
      ext.max = Math.max(ext.max, cross1);
    } else extents.set(key, { min: cross0, max: cross1 });
  }

  const bounds = order.map((k) => extents.get(k)!);
  const starts: number[] = [];
  const ends: number[] = [];
  for (let i = 0; i < order.length; i++) {
    const prev = bounds[i - 1];
    const next = bounds[i + 1];
    const cur = bounds[i];
    starts.push(
      prev ? Math.max((prev.max + cur.min) / 2, cur.min - LANE_PADDING) : cur.min - LANE_PADDING,
    );
    ends.push(
      next ? Math.min((cur.max + next.min) / 2, cur.max + LANE_PADDING) : cur.max + LANE_PADDING,
    );
  }
  // Make neighbouring lanes share a boundary so there are no gaps.
  for (let i = 1; i < order.length; i++) {
    const shared = Math.max(ends[i - 1], starts[i]);
    ends[i - 1] = shared;
    starts[i] = shared;
  }

  const mainStart = mainMin - LANE_PADDING - LANE_HEADER;
  const mainLength = mainMax - mainMin + LANE_PADDING * 2 + LANE_HEADER;

  return order.map((department, i) => {
    const cross = starts[i];
    const crossLen = Math.max(ends[i] - starts[i], 1);
    return isTB
      ? { department, x: cross, y: mainStart, width: crossLen, height: mainLength }
      : { department, x: mainStart, y: cross, width: mainLength, height: crossLen };
  });
}

export function laneAtPosition(
  lanes: Lane[],
  point: { x: number; y: number },
  direction: LayoutDirection,
): Lane | undefined {
  const v = direction === 'TB' ? point.x : point.y;
  return lanes.find((l) =>
    direction === 'TB' ? v >= l.x && v <= l.x + l.width : v >= l.y && v <= l.y + l.height,
  );
}
