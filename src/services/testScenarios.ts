import type { Language } from '../i18n';
import type { FlowEdge, FlowNode, FlowProject } from '../types/flow';
import { edgeLabel, orderNodes } from './textExport';

const STRINGS = {
  mainFlow: { ko: '정상 흐름', en: 'Happy path' },
  branch: { ko: '분기', en: 'Branch' },
  altFlow: { ko: '대안 흐름', en: 'Alternate flow' },
  startAt: { ko: '시작 조건', en: 'Start condition' },
  systemsReady: { ko: '관련 시스템 접근 가능', en: 'Related systems reachable' },
  reaches: { ko: '도달', en: 'Reaches' },
  expectedEnd: { ko: '플로우가 정상 종료됨', en: 'Flow completes' },
  expectedLast: { ko: '마지막 단계 완료', en: 'Last step completed' },
  loopsBack: { ko: '재작업 루프 — 다음 단계로 되돌아감', en: 'Rework loop — returns to' },
  choose: { ko: '선택', en: 'choose' },
  manual: { ko: '수작업', en: 'Manual' },
  // sheet/column labels
  sheetScenarios: { ko: '통합테스트 시나리오', en: 'Integration test scenarios' },
  sheetCoverage: { ko: '커버리지', en: 'Coverage' },
  id: { ko: 'TC ID', en: 'TC ID' },
  name: { ko: '시나리오', en: 'Scenario' },
  kind: { ko: '유형', en: 'Type' },
  preconditions: { ko: '사전조건', en: 'Preconditions' },
  steps: { ko: '테스트 단계', en: 'Test steps' },
  expected: { ko: '기대결과', en: 'Expected result' },
  systems: { ko: '관련 시스템', en: 'Systems' },
  departments: { ko: '관련 부서', en: 'Departments' },
  decisions: { ko: '분기 선택', en: 'Branch choices' },
  stepCount: { ko: '단계 수', en: 'Steps' },
  decision: { ko: '분기 노드', en: 'Decision' },
  option: { ko: '선택지', en: 'Option' },
  coveredBy: { ko: '커버하는 TC', en: 'Covered by' },
  system: { ko: '시스템', en: 'System' },
  tcCount: { ko: 'TC 수', en: 'TCs' },
  summary: { ko: '요약', en: 'Summary' },
  totalTcs: { ko: '총 시나리오 수', en: 'Total scenarios' },
  branchCoverage: { ko: '분기 커버리지', en: 'Branch coverage' },
  truncated: {
    ko: '경로가 많아 처음 {n}개만 생성했습니다',
    en: 'Too many paths; only the first {n} were generated',
  },
} as const;

export const ts = (key: keyof typeof STRINGS, lang: Language) => STRINGS[key][lang];

export const MAX_SCENARIOS = 40;

export interface ScenarioStep {
  no: number;
  node: FlowNode;
  /** Label of the edge that led here (branch choice), if any. */
  via?: string;
}

export interface TestScenario {
  id: string;
  name: string;
  kind: 'main' | 'alternate';
  preconditions: string[];
  steps: ScenarioStep[];
  expected: string;
  systems: string[];
  departments: string[];
  /** decision label → chosen branch label */
  choices: Array<{ decision: string; option: string }>;
}

export interface BranchCoverage {
  decision: string;
  option: string;
  scenarioIds: string[];
}

export interface SystemCoverage {
  system: string;
  scenarioIds: string[];
}

export interface ScenarioSuite {
  title: string;
  scenarios: TestScenario[];
  branches: BranchCoverage[];
  systems: SystemCoverage[];
  truncated: boolean;
}

interface Path {
  nodes: FlowNode[];
  /** Set when the path ends because every next step was already visited (loop). */
  loopTo?: FlowNode;
  vias: Array<string | undefined>;
  choices: Array<{ decision: string; option: string }>;
}

/** Prefer yes/first edges so the first path is the happy path. */
function branchRank(e: FlowEdge): number {
  if (e.sourceHandle === 'yes') return 0;
  if (e.sourceHandle === 'no') return 2;
  return 1;
}

function enumeratePaths(
  nodes: FlowNode[],
  edges: FlowEdge[],
  lang: Language,
): { paths: Path[]; truncated: boolean } {
  const ordered = orderNodes(nodes, edges);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const incoming = new Set(edges.map((e) => e.target));
  const starts = ordered.filter(
    (n) => n.data.nodeType !== 'annotation' && (n.data.nodeType === 'start' || !incoming.has(n.id)),
  );
  const paths: Path[] = [];
  let truncated = false;

  const walk = (cur: FlowNode, path: Path, visited: Set<string>) => {
    if (paths.length >= MAX_SCENARIOS) {
      truncated = true;
      return;
    }
    const out = edges
      .filter((e) => e.source === cur.id && byId.has(e.target))
      .filter((e) => byId.get(e.target)?.data.nodeType !== 'annotation')
      .sort((a, b) => branchRank(a) - branchRank(b));
    const next = out.filter((e) => !visited.has(e.target));
    if (next.length === 0) {
      paths.push(out.length ? { ...path, loopTo: byId.get(out[0].target) } : path);
      return;
    }
    const isDecision = cur.data.nodeType === 'decision' && out.length > 1;
    const targets = isDecision ? next : [next[0]];
    for (const e of targets) {
      const target = byId.get(e.target);
      if (!target) continue;
      const label = edgeLabel(e, lang);
      walk(
        target,
        {
          nodes: [...path.nodes, target],
          vias: [...path.vias, label || undefined],
          choices: isDecision
            ? [...path.choices, { decision: cur.data.label, option: label || '→' }]
            : path.choices,
        },
        new Set([...visited, target.id]),
      );
    }
  };

  for (const start of starts) {
    walk(start, { nodes: [start], vias: [undefined], choices: [] }, new Set([start.id]));
  }
  return { paths, truncated };
}

function uniq(values: Array<string | undefined>): string[] {
  return [...new Set(values.map((v) => v?.trim()).filter((v): v is string => !!v))];
}

export function generateScenarios(
  project: Pick<FlowProject, 'nodes' | 'edges' | 'title'>,
  lang: Language,
): ScenarioSuite {
  const { nodes, edges } = project;
  const { paths, truncated } = enumeratePaths(nodes, edges, lang);
  const sameChoiceCount = new Map<string, number>();

  const scenarios: TestScenario[] = paths.map((p, i) => {
    const id = `TC-${String(i + 1).padStart(2, '0')}`;
    const kind: TestScenario['kind'] = i === 0 ? 'main' : 'alternate';
    const steps: ScenarioStep[] = p.nodes.map((node, idx) => ({
      no: idx + 1,
      node,
      via: p.vias[idx],
    }));
    const systems = uniq(p.nodes.map((n) => n.data.system));
    const departments = uniq(p.nodes.map((n) => n.data.department));
    const last = p.nodes[p.nodes.length - 1];

    let name: string = ts('mainFlow', lang);
    if (kind === 'alternate') {
      const diff = p.choices.filter(
        (c) => c.option !== paths[0].choices.find((m) => m.decision === c.decision)?.option,
      );
      const base = diff.length
        ? `${ts('branch', lang)}: ${diff.map((c) => `${c.decision} = ${c.option}`).join(', ')}`
        : `${ts('altFlow', lang)}: ${p.nodes[0].data.label} → ${last.data.label}`;
      const n = (sameChoiceCount.get(base) ?? 0) + 1;
      sameChoiceCount.set(base, n);
      name = n > 1 ? `${base} (${n})` : base;
    }

    const preconditions = [`${ts('startAt', lang)}: ${p.nodes[0].data.label}`];
    if (systems.length) preconditions.push(`${ts('systemsReady', lang)}: ${systems.join(', ')}`);

    const expected =
      last.data.nodeType === 'end'
        ? `${ts('expectedEnd', lang)} — ${ts('reaches', lang)}: ${last.data.label}`
        : p.loopTo
          ? `${ts('expectedLast', lang)}: ${last.data.label} → ${ts('loopsBack', lang)}: ${p.loopTo.data.label}`
          : `${ts('expectedLast', lang)}: ${last.data.label}`;

    return {
      id,
      name,
      kind,
      preconditions,
      steps,
      expected,
      systems,
      departments,
      choices: p.choices,
    };
  });

  const branches: BranchCoverage[] = [];
  for (const n of nodes.filter((n) => n.data.nodeType === 'decision')) {
    for (const e of edges.filter((e) => e.source === n.id)) {
      const option = edgeLabel(e, lang) || '→';
      const ids = scenarios
        .filter((s) => s.choices.some((c) => c.decision === n.data.label && c.option === option))
        .map((s) => s.id);
      branches.push({ decision: n.data.label, option, scenarioIds: ids });
    }
  }

  const systemNames = uniq(nodes.map((n) => n.data.system));
  const systems: SystemCoverage[] = systemNames.map((system) => ({
    system,
    scenarioIds: scenarios.filter((s) => s.systems.includes(system)).map((s) => s.id),
  }));

  return { title: project.title, scenarios, branches, systems, truncated };
}

export function stepText(step: ScenarioStep, lang: Language): string {
  const d = step.node.data;
  const meta = [d.system || (d.nodeType === 'task' ? ts('manual', lang) : undefined), d.department]
    .filter(Boolean)
    .join(' / ');
  const via = step.via ? `[${step.via}] ` : '';
  return `${step.no}. ${via}${d.label}${meta ? ` (${meta})` : ''}`;
}

export function suiteToMarkdown(suite: ScenarioSuite, lang: Language): string {
  const out: string[] = [`# ${ts('sheetScenarios', lang)} — ${suite.title}`, ''];
  if (suite.truncated)
    out.push(`> ${ts('truncated', lang).replace('{n}', String(MAX_SCENARIOS))}`, '');
  out.push(
    `| ${ts('id', lang)} | ${ts('name', lang)} | ${ts('preconditions', lang)} | ${ts('steps', lang)} | ${ts('expected', lang)} | ${ts('systems', lang)} |`,
    '|---|---|---|---|---|---|',
  );
  for (const sc of suite.scenarios) {
    out.push(
      `| ${sc.id} | ${sc.name} | ${sc.preconditions.join('<br>')} | ${sc.steps.map((st) => stepText(st, lang)).join('<br>')} | ${sc.expected} | ${sc.systems.join(', ')} |`,
    );
  }
  if (suite.branches.length) {
    out.push(
      '',
      `## ${ts('branchCoverage', lang)}`,
      '',
      `| ${ts('decision', lang)} | ${ts('option', lang)} | ${ts('coveredBy', lang)} |`,
      '|---|---|---|',
    );
    for (const b of suite.branches)
      out.push(`| ${b.decision} | ${b.option} | ${b.scenarioIds.join(', ') || '—'} |`);
  }
  if (suite.systems.length) {
    out.push(
      '',
      `## ${ts('systems', lang)}`,
      '',
      `| ${ts('system', lang)} | ${ts('tcCount', lang)} | ${ts('coveredBy', lang)} |`,
      '|---|---|---|',
    );
    for (const sys of suite.systems)
      out.push(`| ${sys.system} | ${sys.scenarioIds.length} | ${sys.scenarioIds.join(', ')} |`);
  }
  return out.join('\n');
}
