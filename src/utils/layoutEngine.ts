import dagre from '@dagrejs/dagre';
import type { FlowEdge, FlowNode, LaneBy, LayoutDirection } from '../types/flow';
import { nodeSize } from '../constants/nodeTypes';
import { laneKey, sizeOf } from './swimlanes';

export const NODE_SEP = 80;
export const RANK_SEP = 100;
const LANE_GAP = 120;
const LANE_NODE_GAP = 32;

interface LayoutOptions {
  direction?: LayoutDirection;
  /** When true, nodes with `data.pinned` keep their current position. */
  respectPinned?: boolean;
  /** Group nodes into lanes along the cross axis. */
  swimlanes?: boolean;
  laneBy?: LaneBy;
}

export function layoutFlow(
  nodes: FlowNode[],
  edges: FlowEdge[],
  {
    direction = 'TB',
    respectPinned = true,
    swimlanes = false,
    laneBy = 'department',
  }: LayoutOptions = {},
): FlowNode[] {
  if (nodes.length === 0) return nodes;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: NODE_SEP,
    ranksep: RANK_SEP,
    marginx: 40,
    marginy: 40,
  });

  for (const node of nodes) {
    const size =
      node.measured?.width && node.measured?.height
        ? { width: node.measured.width, height: node.measured.height }
        : nodeSize(node.data.nodeType);
    g.setNode(node.id, size);
  }
  const ids = new Set(nodes.map((n) => n.id));
  for (const edge of edges) {
    if (ids.has(edge.source) && ids.has(edge.target)) g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const laidOut = nodes.map((node) => {
    if (respectPinned && node.data.pinned) return node;
    const pos = g.node(node.id);
    if (!pos) return node;
    const size =
      node.measured?.width && node.measured?.height
        ? { width: node.measured.width, height: node.measured.height }
        : nodeSize(node.data.nodeType);
    return {
      ...node,
      position: { x: pos.x - size.width / 2, y: pos.y - size.height / 2 },
    };
  });

  return swimlanes ? applySwimlanes(laidOut, direction, respectPinned, laneBy) : laidOut;
}

/**
 * Re-distribute dagre output along the cross axis so every department/system occupies its own lane.
 * Lane order follows the average cross-axis position dagre chose, keeping edges short.
 */
function applySwimlanes(
  nodes: FlowNode[],
  direction: LayoutDirection,
  respectPinned: boolean,
  laneBy: LaneBy,
): FlowNode[] {
  const isTB = direction === 'TB';
  const cross = (n: FlowNode) => (isTB ? n.position.x : n.position.y);
  const crossSize = (n: FlowNode) => (isTB ? sizeOf(n).width : sizeOf(n).height);
  const mainSize = (n: FlowNode) => (isTB ? sizeOf(n).height : sizeOf(n).width);

  const lanes = new Map<string, { nodes: FlowNode[]; sum: number; maxCross: number }>();
  for (const n of nodes) {
    const key = laneKey(n, laneBy);
    const lane = lanes.get(key) ?? { nodes: [], sum: 0, maxCross: 0 };
    lane.nodes.push(n);
    lane.sum += cross(n) + crossSize(n) / 2;
    lane.maxCross = Math.max(lane.maxCross, crossSize(n));
    lanes.set(key, lane);
  }
  const ordered = [...lanes.values()].sort(
    (a, b) => a.sum / a.nodes.length - b.sum / b.nodes.length,
  );

  const placed = new Map<string, FlowNode>();
  let laneStart = 40;
  for (const lane of ordered) {
    const laneWidth = lane.maxCross + LANE_GAP;
    const sorted = [...lane.nodes].sort((a, b) =>
      isTB ? a.position.y - b.position.y : a.position.x - b.position.x,
    );
    let cursor = -Infinity;
    for (const n of sorted) {
      if (respectPinned && n.data.pinned) {
        placed.set(n.id, n);
        continue;
      }
      const centered = laneStart + (laneWidth - crossSize(n)) / 2;
      let main = isTB ? n.position.y : n.position.x;
      if (main < cursor) main = cursor;
      cursor = main + mainSize(n) + LANE_NODE_GAP;
      placed.set(n.id, {
        ...n,
        position: isTB ? { x: centered, y: main } : { x: main, y: centered },
      });
    }
    laneStart += laneWidth;
  }
  return nodes.map((n) => placed.get(n.id) ?? n);
}
