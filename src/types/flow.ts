import type { Edge, Node } from '@xyflow/react';
import type { RoleType } from './role';

export type NodeType =
  | 'start'
  | 'end'
  | 'task'
  | 'decision'
  | 'subprocess'
  | 'system'
  | 'data'
  | 'timer'
  | 'parallel'
  | 'annotation';

export type LayoutDirection = 'TB' | 'LR';

/** Which node attribute swimlanes group by. */
export type LaneBy = 'department' | 'system';

export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  description?: string;
  department?: string;
  /** Business system the step runs in (ERP, CRM, …). */
  system?: string;
  estimatedTime?: string;
  nodeType: NodeType;
  color?: string;
  /** User moved this node manually; auto layout leaves it in place. */
  pinned?: boolean;
  /** Subprocess only: collapsed state. */
  collapsed?: boolean;
}

export interface FlowEdgeData extends Record<string, unknown> {
  condition?: string;
  style?: 'solid' | 'dashed';
  /** Code of the registered interface this transition goes through (e.g. "IF-001"). */
  interface?: string;
}

export type FlowNode = Node<FlowNodeData, NodeType>;
export type FlowEdge = Edge<FlowEdgeData>;

export interface FlowProject {
  id: string;
  title: string;
  role: RoleType;
  nodes: FlowNode[];
  edges: FlowEdge[];
  layoutDirection: LayoutDirection;
  swimlanes?: boolean;
  laneBy?: LaneBy;
  createdAt: string;
  updatedAt: string;
  version: number;
}

/** Shape the AI is asked to return. */
export interface AIFlowNode {
  id: string;
  type: NodeType | string;
  label: string;
  description?: string;
  department?: string;
  system?: string;
  estimatedTime?: string;
}

export interface AIFlowEdge {
  source: string;
  target: string;
  label?: string;
  type?: string;
}

export interface AIFlowResponse {
  title?: string;
  nodes: AIFlowNode[];
  edges: AIFlowEdge[];
}

export interface GenerateRequest {
  prompt: string;
  role: RoleType;
  existingFlow: AIFlowResponse | null;
  language?: 'ko' | 'en';
  /** Names of systems registered in the catalog; the generator should reuse them. */
  systems?: string[];
}

export interface GenerateResponse {
  flow: AIFlowResponse;
  /** true when the server had no API key and produced a heuristic mock flow. */
  mock: boolean;
  model?: string;
}
