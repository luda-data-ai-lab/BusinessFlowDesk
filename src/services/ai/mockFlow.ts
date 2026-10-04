import type { AIFlowResponse, AIFlowNode, AIFlowEdge } from '../../types/flow';
import type { RoleType } from '../../types/role';

/**
 * Heuristic, dependency-free flow generator used when no CLAUDE_API_KEY is configured.
 * It splits the prompt into steps so the app remains fully usable in demo mode.
 */

const SPLIT_PATTERN = /[,.\n;→>]|그리고|하고|한 뒤|후에|다음에?|then|and then|after that|,\s*and/gi;
const DECISION_HINTS =
  /검사|검수|승인|확인|검토|판단|심사|review|approve|check|verify|validate|inspect|decision/i;
const SYSTEM_HINTS =
  /api|시스템|서버|erp|crm|db|데이터베이스|호출|전송|연동|배포|deploy|service|database/i;
const DATA_HINTS = /문서|보고서|데이터|파일|report|document|file|data|기록|로그/i;
const TIMER_HINTS = /대기|기다|지연|wait|delay|timeout|타임아웃/i;
const SUBPROCESS_HINTS = /프로세스|절차|단계|마일스톤|milestone|phase|process/i;

const DEPARTMENTS: Record<RoleType, string[]> = {
  operations: ['영업팀', '운영팀', '생산팀', '품질팀', '물류팀', '재무팀'],
  pm: ['PM', '기획', '디자인', '개발', 'QA', '운영'],
  developer: ['Client', 'API Gateway', 'Auth Service', 'Backend', 'Database', 'Worker'],
  executive: ['경영진', '사업부', '재무', '전략기획', '인사'],
  consultant: ['고객', '영업 레인', '운영 레인', '시스템 레인', '관리 레인'],
};

const SYSTEMS: Record<RoleType, string[]> = {
  operations: ['ERP', 'CRM', '그룹웨어', 'WMS'],
  pm: ['Jira', 'Confluence', 'Figma', 'GitHub'],
  developer: ['API Gateway', 'Auth Service', 'Backend', 'PostgreSQL', 'Message Queue'],
  executive: ['BI 대시보드', 'ERP', '그룹웨어'],
  consultant: ['ERP', 'CRM', '레거시 시스템', '사내 포털'],
};

/** Demo heuristic: steps that mention a system or are system/data typed get a system tag. */
function pickSystem(
  step: string,
  type: AIFlowNode['type'],
  role: RoleType,
  i: number,
  registered: string[] = [],
) {
  const mentioned = registered.find((s) => step.toLowerCase().includes(s.toLowerCase()));
  if (mentioned) return mentioned;
  const list = registered.length ? registered : SYSTEMS[role];
  const named = step.match(/\b(erp|crm|wms|mes|pos|sap|jira|slack|github|salesforce)\b/i);
  if (named && !registered.length) return named[1].toUpperCase();
  if (type === 'system' || type === 'data' || SYSTEM_HINTS.test(step)) {
    return list[i % list.length];
  }
  return undefined;
}

const TIMES: Record<RoleType, string[]> = {
  operations: ['30min', '1h', '2h', '4h', '1d'],
  pm: ['1d', '3d', '1w', '2w'],
  developer: ['50ms', '200ms', '1s', '5s'],
  executive: ['1w', '2w', '1m'],
  consultant: ['1h', '4h', '1d', '2d'],
};

function clean(step: string): string {
  return step
    .replace(/^(그려줘|만들어줘|정리해줘|보여줘|draw|create|make|show|outline)\s*/i, '')
    .replace(
      /(를|을|이|가|은|는|의)\s*(그려줘|만들어줘|정리해줘|보여줘|맵핑해줘|요약해줘|프로세스|흐름|플로우)?\s*$/g,
      '',
    )
    .replace(/(해줘|해주세요|주세요|그려줘|만들어줘)$/g, '')
    .replace(/\s+(를|을|이|가|은|는|의|에|로|으로)(?=\s|$)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function splitSteps(prompt: string): string[] {
  const parts = prompt
    .split(SPLIT_PATTERN)
    .map((s) => clean(s ?? ''))
    .filter((s) => s.length >= 2 && s.length <= 40);
  const unique = Array.from(new Set(parts));
  if (unique.length >= 3) return unique.slice(0, 9);

  // Not enough structure in the prompt: derive a generic process skeleton around the topic.
  const topic = clean(prompt).slice(0, 24) || '업무';
  return [
    `${topic} 요청 접수`,
    `${topic} 담당자 배정`,
    `${topic} 수행`,
    `${topic} 검토 및 승인`,
    `${topic} 결과 공유`,
  ];
}

export function generateMockFlow(
  prompt: string,
  role: RoleType,
  existing: AIFlowResponse | null,
  registered: string[] = [],
): AIFlowResponse {
  if (existing && existing.nodes.length > 0) return modifyMockFlow(prompt, role, existing);

  const steps = splitSteps(prompt);
  const departments = DEPARTMENTS[role];
  const times = TIMES[role];
  const nodes: AIFlowNode[] = [{ id: 'n1', type: 'start', label: '시작' }];
  const edges: AIFlowEdge[] = [];
  let counter = 2;
  let prev = 'n1';

  steps.forEach((step, i) => {
    const id = `n${counter++}`;
    let type: AIFlowNode['type'] = 'task';
    if (DECISION_HINTS.test(step)) type = 'decision';
    else if (role === 'developer' && SYSTEM_HINTS.test(step)) type = 'system';
    else if (DATA_HINTS.test(step)) type = 'data';
    else if (TIMER_HINTS.test(step)) type = 'timer';
    else if (role === 'pm' && SUBPROCESS_HINTS.test(step)) type = 'subprocess';

    nodes.push({
      id,
      type,
      label: type === 'decision' ? `${step}?` : step,
      description: type === 'decision' ? `${step} 결과에 따라 분기` : `${step} 단계`,
      department: departments[i % departments.length],
      system: pickSystem(step, type, role, i, registered),
      estimatedTime: times[i % times.length],
    });
    edges.push({ source: prev, target: id, label: '' });

    if (type === 'decision') {
      const reworkId = `n${counter++}`;
      nodes.push({
        id: reworkId,
        type: role === 'developer' ? 'system' : 'task',
        label: role === 'developer' ? '재시도 / 오류 처리' : '보완 및 재작업',
        description: '조건 불충족 시 이전 단계로 돌아가 보완',
        department: departments[(i + 1) % departments.length],
        estimatedTime: times[(i + 2) % times.length],
      });
      edges.push({ source: id, target: reworkId, label: role === 'developer' ? '실패' : '아니오' });
      edges.push({ source: reworkId, target: prev, label: '' });
      prev = id;
      return;
    }
    prev = id;
  });

  const endId = `n${counter++}`;
  nodes.push({ id: endId, type: 'end', label: '종료' });
  const lastIsDecision = nodes.find((n) => n.id === prev)?.type === 'decision';
  edges.push({
    source: prev,
    target: endId,
    label: lastIsDecision ? (role === 'developer' ? '성공' : '예') : '',
  });

  // Decision nodes in the middle need their "yes" branch to continue forward.
  for (const e of edges) {
    const src = nodes.find((n) => n.id === e.source);
    if (src?.type === 'decision' && !e.label) e.label = role === 'developer' ? '성공' : '예';
  }

  return { title: clean(prompt).slice(0, 30) || '새 플로우', nodes, edges };
}

function modifyMockFlow(prompt: string, role: RoleType, existing: AIFlowResponse): AIFlowResponse {
  const nodes = existing.nodes.map((n) => ({ ...n }));
  const edges = existing.edges.map((e) => ({ ...e }));
  const label =
    clean(prompt.replace(/추가|넣어|삽입|add|insert|여기에|뒤에|앞에|단계|스텝|step|노드/gi, '')) ||
    '새 단계';
  const max = nodes.reduce((m, n) => Math.max(m, Number(n.id.replace(/\D/g, '')) || 0), 0);
  const id = `n${max + 1}`;
  const isDecision = DECISION_HINTS.test(label);

  // Insert before the end node (or after the last node if no end exists).
  const end = nodes.find((n) => n.type === 'end');
  const incoming = end ? edges.filter((e) => e.target === end.id) : [];
  const anchor = incoming[0];

  nodes.splice(end ? nodes.indexOf(end) : nodes.length, 0, {
    id,
    type: isDecision ? 'decision' : 'task',
    label: isDecision ? `${label}?` : label,
    description: `프롬프트로 추가된 단계: ${prompt}`,
    department: DEPARTMENTS[role][nodes.length % DEPARTMENTS[role].length],
    estimatedTime: TIMES[role][nodes.length % TIMES[role].length],
  });

  if (anchor && end) {
    anchor.target = id;
    edges.push({ source: id, target: end.id, label: isDecision ? '예' : '' });
    if (isDecision) edges.push({ source: id, target: anchor.source, label: '아니오' });
  } else {
    const last = nodes[nodes.length - 2] ?? nodes[0];
    edges.push({ source: last.id, target: id, label: '' });
  }
  return { title: existing.title, nodes, edges };
}
