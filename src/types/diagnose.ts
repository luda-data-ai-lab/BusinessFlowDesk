import type { AIFlowResponse } from './flow';

export type FindingSeverity = 'high' | 'medium' | 'low';
export type ImprovementKind = 'ai-agent' | 'automation' | 'process' | 'system' | 'control';
export type ImprovementEffort = 'low' | 'medium' | 'high';

export interface DiagnosisFinding {
  severity: FindingSeverity;
  title: string;
  detail: string;
  /** Ids of nodes in the diagnosed scope this finding refers to. */
  nodeIds: string[];
}

export interface DiagnosisImprovement {
  kind: ImprovementKind;
  title: string;
  detail: string;
  /** For `ai-agent`: what the agent does, its inputs/outputs and guardrails. */
  agent?: string;
  effort: ImprovementEffort;
  nodeIds: string[];
}

export interface Diagnosis {
  summary: string;
  findings: DiagnosisFinding[];
  improvements: DiagnosisImprovement[];
}

export interface DiagnoseRequest {
  /** The whole flow (context) in the same shape the generator uses. */
  flow: AIFlowResponse;
  /** Ids of nodes the user selected; empty = whole flow. */
  scope: string[];
  /** Interface codes mapped on edges inside the scope (edge "source->target" → code). */
  interfaces?: Record<string, string>;
  /** Optional user hint ("비용 관점에서", "자동화 위주로"). */
  focus?: string;
  language?: 'ko' | 'en';
}

export interface DiagnoseResponse {
  diagnosis: Diagnosis;
  mock: boolean;
  model?: string;
}

export const SEVERITIES: FindingSeverity[] = ['high', 'medium', 'low'];
export const IMPROVEMENT_KINDS: ImprovementKind[] = [
  'ai-agent',
  'automation',
  'process',
  'system',
  'control',
];
