import { MarkerType } from '@xyflow/react';
import type {
  AIFlowEdge,
  AIFlowNode,
  AIFlowResponse,
  FlowEdge,
  FlowNode,
  NodeType,
} from '../types/flow';
import { isNodeType, NODE_TYPE_MAP } from '../constants/nodeTypes';

const TYPE_ALIASES: Record<string, NodeType> = {
  process: 'task',
  step: 'task',
  action: 'task',
  activity: 'task',
  condition: 'decision',
  branch: 'decision',
  gateway: 'decision',
  sub: 'subprocess',
  subflow: 'subprocess',
  api: 'system',
  service: 'system',
  db: 'data',
  database: 'data',
  document: 'data',
  wait: 'timer',
  delay: 'timer',
  fork: 'parallel',
  join: 'parallel',
  note: 'annotation',
  comment: 'annotation',
  begin: 'start',
  finish: 'end',
  stop: 'end',
  terminate: 'end',
};

export function normalizeNodeType(raw: string | undefined): NodeType {
  const key = (raw ?? 'task').toLowerCase().trim();
  if (isNodeType(key)) return key;
  return TYPE_ALIASES[key] ?? 'task';
}

const YES_PATTERN = /^(yes|y|true|ok|pass|passed|approved?|승인|예|통과|성공|적합|완료|정상)/i;
const NO_PATTERN =
  /^(no|n|false|fail(ed)?|reject(ed)?|error|거절|아니오|아니요|불통과|실패|부적합|반려|오류)/i;

export function decisionHandleForLabel(
  label: string | undefined,
  index: number,
): 'yes' | 'no' | undefined {
  const text = (label ?? '').trim();
  if (YES_PATTERN.test(text)) return 'yes';
  if (NO_PATTERN.test(text)) return 'no';
  if (text) return index === 0 ? 'yes' : 'no';
  return undefined;
}

export function newId(prefix = 'n'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

export function aiNodeToFlowNode(n: AIFlowNode, existing?: FlowNode): FlowNode {
  const nodeType = normalizeNodeType(n.type);
  return {
    id: n.id,
    type: nodeType,
    position: existing?.position ?? { x: 0, y: 0 },
    data: {
      ...existing?.data,
      label: n.label?.trim() || NODE_TYPE_MAP[nodeType].label.ko,
      description: n.description?.trim() || undefined,
      department: n.department?.trim() || undefined,
      estimatedTime: n.estimatedTime?.trim() || undefined,
      nodeType,
      color: existing?.data.color,
      pinned: existing?.data.pinned,
    },
  };
}

export function buildEdge(
  e: { source: string; target: string; label?: string; sourceHandle?: string | null },
  nodesById: Map<string, FlowNode>,
  index: number,
  id?: string,
): FlowEdge | null {
  const source = nodesById.get(e.source);
  const target = nodesById.get(e.target);
  if (!source || !target || e.source === e.target) return null;
  const label = e.label?.trim() || undefined;
  const sourceHandle =
    e.sourceHandle ??
    (source.data.nodeType === 'decision' ? decisionHandleForLabel(label, index) : undefined);
  return {
    id: id ?? `e_${e.source}_${e.target}_${index}`,
    source: e.source,
    target: e.target,
    sourceHandle: sourceHandle ?? null,
    type: 'conditional',
    label,
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
    data: { condition: label, style: 'solid' },
  };
}

/**
 * Converts the AI response into React Flow nodes/edges.
 * Existing nodes (matched by id) keep position/colour/pinned state so incremental
 * modifications don't scramble the canvas.
 */
export function parseAIFlow(
  response: AIFlowResponse,
  existingNodes: FlowNode[] = [],
): { nodes: FlowNode[]; edges: FlowEdge[]; title?: string } {
  const existingById = new Map(existingNodes.map((n) => [n.id, n]));
  const seen = new Set<string>();
  const nodes: FlowNode[] = [];

  for (const raw of response.nodes ?? []) {
    if (!raw || typeof raw !== 'object') continue;
    let id = String(raw.id ?? '').trim() || newId();
    if (seen.has(id)) id = newId();
    seen.add(id);
    nodes.push(aiNodeToFlowNode({ ...raw, id }, existingById.get(id)));
  }

  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const edges: FlowEdge[] = [];
  const edgeKeys = new Set<string>();
  // Track index per decision source so the first branch gets "yes" and the second "no".
  const perSource = new Map<string, number>();

  for (const raw of (response.edges ?? []) as AIFlowEdge[]) {
    if (!raw || typeof raw !== 'object') continue;
    const source = String(raw.source ?? '');
    const target = String(raw.target ?? '');
    const key = `${source}->${target}`;
    if (edgeKeys.has(key)) continue;
    const idx = perSource.get(source) ?? 0;
    perSource.set(source, idx + 1);
    const edge = buildEdge({ source, target, label: raw.label }, nodesById, idx);
    if (edge) {
      edges.push(edge);
      edgeKeys.add(key);
    }
  }

  return { nodes, edges, title: response.title?.trim() || undefined };
}

/** Serialises current canvas into the compact AI schema for incremental edits. */
export function toAIFlow(nodes: FlowNode[], edges: FlowEdge[], title?: string): AIFlowResponse {
  return {
    title,
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.data.nodeType,
      label: n.data.label,
      description: n.data.description,
      department: n.data.department,
      estimatedTime: n.data.estimatedTime,
    })),
    edges: edges.map((e) => ({
      source: e.source,
      target: e.target,
      label: typeof e.label === 'string' ? e.label : undefined,
      type: 'default',
    })),
  };
}

/** Extracts the first JSON object from a (possibly fenced / chatty) LLM reply. */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    /* fall through */
  }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      /* fall through */
    }
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }
  throw new Error('No JSON object found in AI response');
}

export function isAIFlowResponse(value: unknown): value is AIFlowResponse {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.nodes) && Array.isArray(v.edges);
}
