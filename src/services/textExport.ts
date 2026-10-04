import { NODE_TYPE_MAP } from '../constants/nodeTypes';
import { ROLE_MAP } from '../constants/roles';
import type { Language } from '../i18n';
import type { FlowEdge, FlowNode, FlowProject, NodeType } from '../types/flow';

const STRINGS = {
  title: { ko: '업무 플로우', en: 'Business flow' },
  role: { ko: '직군', en: 'Role' },
  steps: { ko: '단계', en: 'Steps' },
  transitions: { ko: '흐름', en: 'Transitions' },
  department: { ko: '담당', en: 'Owner' },
  system: { ko: '시스템', en: 'System' },
  systems: { ko: '시스템별 단계', en: 'Steps by system' },
  noSystem: { ko: '수작업 / 시스템 없음', en: 'Manual / no system' },
  stepCount: { ko: '단계 수', en: 'Steps' },
  time: { ko: '소요', en: 'Time' },
  type: { ko: '유형', en: 'Type' },
  yes: { ko: '예', en: 'Yes' },
  no: { ko: '아니오', en: 'No' },
  diagram: { ko: '다이어그램', en: 'Diagram' },
  from: { ko: '출발', en: 'From' },
  to: { ko: '도착', en: 'To' },
  condition: { ko: '조건', en: 'Condition' },
} as const;

const s = (key: keyof typeof STRINGS, lang: Language) => STRINGS[key][lang];

const MERMAID_SHAPE: Record<NodeType, [string, string]> = {
  start: ['([', '])'],
  end: ['([', '])'],
  task: ['[', ']'],
  decision: ['{', '}'],
  subprocess: ['[[', ']]'],
  system: ['[(', ')]'],
  data: ['[/', '/]'],
  timer: ['((', '))'],
  parallel: ['[/', '\\]'],
  annotation: ['>', ']'],
};

/** Mermaid node ids must be alphanumeric; map arbitrary ids to n0, n1, … */
function idMap(nodes: FlowNode[]): Map<string, string> {
  return new Map(nodes.map((n, i) => [n.id, `n${i}`]));
}

function mermaidText(text: string): string {
  return `"${text.replace(/"/g, '#quot;').replace(/\n/g, '<br/>')}"`;
}

function edgeLabel(e: FlowEdge, lang: Language): string {
  const raw = typeof e.label === 'string' ? e.label.trim() : '';
  if (raw) return raw;
  const cond = e.data?.condition?.trim();
  if (cond) return cond;
  if (e.sourceHandle === 'yes') return s('yes', lang);
  if (e.sourceHandle === 'no') return s('no', lang);
  return '';
}

/** Depth-first order from start nodes so the document reads top to bottom. */
function orderNodes(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out = new Map<string, FlowNode>();
  const incoming = new Set(edges.map((e) => e.target));
  const roots = nodes.filter((n) => n.data.nodeType === 'start' || !incoming.has(n.id));
  const visit = (id: string) => {
    const n = byId.get(id);
    if (!n || out.has(id)) return;
    out.set(id, n);
    edges.filter((e) => e.source === id).forEach((e) => visit(e.target));
  };
  roots.forEach((n) => visit(n.id));
  nodes.forEach((n) => visit(n.id));
  return [...out.values()];
}

export function toMermaid(
  project: Pick<FlowProject, 'nodes' | 'edges' | 'layoutDirection'>,
  lang: Language,
): string {
  const { nodes, edges, layoutDirection } = project;
  const ids = idMap(nodes);
  const lines = [`flowchart ${layoutDirection === 'LR' ? 'LR' : 'TD'}`];
  for (const n of orderNodes(nodes, edges)) {
    const [open, close] = MERMAID_SHAPE[n.data.nodeType] ?? MERMAID_SHAPE.task;
    lines.push(`  ${ids.get(n.id)}${open}${mermaidText(n.data.label || ' ')}${close}`);
  }
  for (const e of edges) {
    const a = ids.get(e.source);
    const b = ids.get(e.target);
    if (!a || !b) continue;
    const label = edgeLabel(e, lang);
    const arrow = e.data?.style === 'dashed' ? '-.->' : '-->';
    lines.push(label ? `  ${a} ${arrow}|${mermaidText(label)}| ${b}` : `  ${a} ${arrow} ${b}`);
  }
  const styled = nodes.filter((n) => n.data.color);
  for (const n of styled) {
    lines.push(`  style ${ids.get(n.id)} fill:${n.data.color},color:#fff`);
  }
  return lines.join('\n');
}

/** Groups non-annotation steps by system (first-appearance order); empty when no node has a system. */
export function systemMatrix(ordered: FlowNode[]): Array<{ system: string; nodes: FlowNode[] }> {
  const steps = ordered.filter((n) => n.data.nodeType !== 'annotation');
  if (!steps.some((n) => n.data.system?.trim())) return [];
  const groups = new Map<string, FlowNode[]>();
  for (const n of steps) {
    const key = n.data.system?.trim() ?? '';
    groups.set(key, [...(groups.get(key) ?? []), n]);
  }
  return [...groups.entries()]
    .sort((a, b) => Number(a[0] === '') - Number(b[0] === ''))
    .map(([system, nodes]) => ({ system, nodes }));
}

export function toMarkdown(project: FlowProject, lang: Language): string {
  const { nodes, edges } = project;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const title = project.title.trim() || s('title', lang);
  const role = ROLE_MAP[project.role]?.label[lang] ?? project.role;
  const ordered = orderNodes(nodes, edges);
  const index = new Map(ordered.map((n, i) => [n.id, i + 1]));
  const name = (id: string) => byId.get(id)?.data.label ?? id;

  const out: string[] = [`# ${title}`, '', `- ${s('role', lang)}: ${role}`, ''];

  out.push(`## ${s('steps', lang)}`, '');
  ordered.forEach((n, i) => {
    const def = NODE_TYPE_MAP[n.data.nodeType];
    const meta: string[] = [`${s('type', lang)}: ${def?.label[lang] ?? n.data.nodeType}`];
    if (n.data.department) meta.push(`${s('department', lang)}: ${n.data.department}`);
    if (n.data.system) meta.push(`${s('system', lang)}: ${n.data.system}`);
    if (n.data.estimatedTime) meta.push(`${s('time', lang)}: ${n.data.estimatedTime}`);
    out.push(`${i + 1}. **${n.data.label}** — ${meta.join(' · ')}`);
    if (n.data.description?.trim()) out.push(`   ${n.data.description.trim()}`);
    const outgoing = edges.filter((e) => e.source === n.id);
    if (n.data.nodeType === 'decision' && outgoing.length) {
      for (const e of outgoing) {
        out.push(
          `   - ${edgeLabel(e, lang) || '→'} → ${name(e.target)} (#${index.get(e.target) ?? '?'})`,
        );
      }
    }
  });

  const matrix = systemMatrix(ordered);
  if (matrix.length > 0) {
    out.push(
      '',
      `## ${s('systems', lang)}`,
      '',
      `| ${s('system', lang)} | ${s('stepCount', lang)} | ${s('steps', lang)} |`,
      '|---|---|---|',
    );
    for (const row of matrix) {
      const steps = row.nodes.map((n) => `${n.data.label} (#${index.get(n.id) ?? '?'})`).join(', ');
      out.push(`| ${row.system || s('noSystem', lang)} | ${row.nodes.length} | ${steps} |`);
    }
  }

  out.push(
    '',
    `## ${s('transitions', lang)}`,
    '',
    `| # | ${s('from', lang)} | ${s('to', lang)} | ${s('condition', lang)} |`,
    '|---|---|---|---|',
  );
  for (const e of edges) {
    out.push(
      `| ${index.get(e.source) ?? '?'}→${index.get(e.target) ?? '?'} | ${name(e.source)} | ${name(e.target)} | ${edgeLabel(e, lang)} |`,
    );
  }

  out.push('', `## ${s('diagram', lang)}`, '', '```mermaid', toMermaid(project, lang), '```', '');
  return out.join('\n');
}
