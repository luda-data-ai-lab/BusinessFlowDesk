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

export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  description?: string;
  department?: string;
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
}

export interface GenerateResponse {
  flow: AIFlowResponse;
  /** true when the server had no API key and produced a heuristic mock flow. */
  mock: boolean;
  model?: string;
}
