import dagre from '@dagrejs/dagre';
import type { FlowEdge, FlowNode, LayoutDirection } from '../types/flow';
import { nodeSize } from '../constants/nodeTypes';

export const NODE_SEP = 80;
export const RANK_SEP = 100;

interface LayoutOptions {
  direction?: LayoutDirection;
  /** When true, nodes with `data.pinned` keep their current position. */
  respectPinned?: boolean;
}

export function layoutFlow(
  nodes: FlowNode[],
  edges: FlowEdge[],
  { direction = 'TB', respectPinned = true }: LayoutOptions = {},
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

  return nodes.map((node) => {
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
}
