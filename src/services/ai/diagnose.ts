import type { AIFlowNode, AIFlowResponse } from '../../types/flow';
import type {
  Diagnosis,
  DiagnoseRequest,
  DiagnosisFinding,
  DiagnosisImprovement,
  FindingSeverity,
  ImprovementEffort,
  ImprovementKind,
} from '../../types/diagnose';
import { IMPROVEMENT_KINDS, SEVERITIES } from '../../types/diagnose';

export const MAX_FOCUS = 500;
export const MAX_SCOPE = 200;

const DIAGNOSIS_SCHEMA = `{
  "summary": "구간 전체에 대한 2~3문장 진단 요약",
  "findings": [
    { "severity": "high|medium|low", "title": "문제 제목", "detail": "근거와 영향", "nodeIds": ["n3"] }
  ],
  "improvements": [
    {
      "kind": "ai-agent|automation|process|system|control",
      "title": "개선안 제목",
      "detail": "무엇을 어떻게 바꾸는지",
      "agent": "kind가 ai-agent일 때: 에이전트 역할, 입력/출력, 사용 도구, 사람 확인(HITL) 지점",
      "effort": "low|medium|high",
      "nodeIds": ["n3", "n4"]
    }
  ]
}`;

export function buildDiagnoseSystemPrompt(language: 'ko' | 'en'): string {
  const langLine =
    language === 'en' ? 'Write everything in English.' : '모든 문장은 한국어로 작성합니다.';
  return `당신은 업무 프로세스 혁신(BPR)·자동화·AI 에이전트 설계 컨설턴트입니다.
사용자가 업무 플로우에서 선택한 구간을 진단하고 개선안을 제시합니다.

[진단 관점]
- 병목·대기: 승인 대기, 반복 재작업 루프, 순차 처리로 늘어진 구간
- 수작업·중복: 시스템 없이 사람이 전달/입력/대조하는 단계, 같은 데이터를 두 시스템에 입력
- 분기·예외: 판단 기준이 모호한 분기, 예외 경로 누락, 역방향(재작업) 루프
- 시스템 경계: 시스템이 바뀌는 전이에 인터페이스가 없거나 수작업으로 넘기는 구간
- 통제·가시성: 검증/확인 단계 부재, 기록·추적 불가

[개선안 종류]
- ai-agent: LLM 기반 에이전트가 맡을 수 있는 단계(문서 요약·분류, 데이터 추출, 초안 작성, 질의응답, 이상 탐지). 반드시 agent 필드에 역할·입력/출력·도구·사람 확인 지점을 적습니다.
- automation: RPA/워크플로 엔진/스케줄러/규칙 엔진으로 자동화
- process: 단계 병합·삭제·순서 변경·병렬화
- system: 시스템 간 인터페이스 신설, 데이터 단일 입력
- control: 검증·승인·모니터링 추가

[규칙]
- 선택 구간(scope) 안의 노드에 집중하되, 앞뒤 맥락은 참고만 합니다.
- nodeIds에는 반드시 주어진 노드 id만 사용합니다.
- findings 3~6개, improvements 3~6개. 근거 없는 일반론은 피합니다.
- ${langLine}

[출력 형식] 아래 JSON 스키마만 출력합니다. 설명 문장이나 마크다운 코드 펜스 없이 순수 JSON 객체 하나만 반환합니다:
${DIAGNOSIS_SCHEMA}`;
}

export function buildDiagnoseUserPrompt(req: DiagnoseRequest): string {
  const scope = req.scope.length ? req.scope.join(', ') : '(전체 플로우)';
  const ifs =
    req.interfaces && Object.keys(req.interfaces).length
      ? `\n[엣지에 매핑된 인터페이스]\n${Object.entries(req.interfaces)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join('\n')}`
      : '';
  const focus = req.focus?.trim() ? `\n[사용자 요청 관점]\n${req.focus.trim()}` : '';
  return `[전체 플로우 JSON]\n${JSON.stringify(req.flow)}\n\n[진단 대상 노드 id]\n${scope}${ifs}${focus}`;
}

/* ------------------------------------------------------------------ */
/* Rule-based fallback (no API key / static hosting)                   */
/* ------------------------------------------------------------------ */

const T = {
  ko: {
    summary: (n: number, manual: number, boundaries: number) =>
      `선택 구간 ${n}단계 중 시스템 없이 수행되는 수작업 단계가 ${manual}개, 시스템 경계 전이가 ${boundaries}건입니다. 수작업·전달 구간을 자동화·AI 에이전트로 대체하고 시스템 경계에 인터페이스를 두는 것이 우선 과제입니다.`,
    manualT: '수작업 단계',
    manualD: (l: string) =>
      `"${l}"은(는) 시스템이 지정되지 않은 수작업 단계로, 처리 시간 편차와 입력 오류 위험이 큽니다.`,
    boundaryT: '인터페이스 없는 시스템 경계',
    boundaryD: (a: string, b: string, x: string, y: string) =>
      `"${a}"(${x}) → "${b}"(${y}) 전이에 매핑된 인터페이스가 없어 데이터가 사람 손을 거쳐 넘어갈 가능성이 높습니다.`,
    loopT: '재작업 루프',
    loopD: (l: string) =>
      `"${l}" 이후 앞 단계로 되돌아가는 루프가 있어 반려·재작업이 반복될수록 리드타임이 늘어납니다.`,
    decisionT: '판단 기준이 없는 분기',
    decisionD: (l: string) =>
      `분기 "${l}"의 조건 라벨이 비어 있거나 모호해 담당자마다 판단이 달라질 수 있습니다.`,
    chainT: '검증 없이 이어지는 긴 순차 구간',
    chainD: (n: number) => `${n}개 단계가 분기·검증 없이 순차로 이어져 오류가 뒤에서야 발견됩니다.`,
    timerT: '대기 단계',
    timerD: (l: string) =>
      `"${l}" 대기 단계는 가치가 창출되지 않는 시간입니다. 대기 사유(승인·외부 응답)를 줄일 수 있는지 확인하세요.`,
    agentT: (l: string) => `"${l}" AI 에이전트 적용`,
    agentD:
      '입력 문서·요청을 LLM 에이전트가 읽고 분류·추출·초안 작성까지 수행한 뒤, 담당자는 결과 확인(승인)만 합니다.',
    agentA: (l: string, sys: string) =>
      `역할: ${l} 처리 에이전트 · 입력: 요청 문서/메일/폼 데이터 · 출력: ${sys || '대상 시스템'} 등록용 구조화 데이터 + 요약 · 도구: ${sys || '시스템'} API, 문서 파서 · HITL: 신뢰도 낮은 건은 담당자 확인 큐로 전달`,
    rpaT: (l: string) => `"${l}" 입력 자동화(RPA/워크플로)`,
    rpaD: '규칙이 명확한 전기·입력·전달 작업은 RPA 또는 워크플로 엔진으로 자동 실행하고 예외만 사람이 처리합니다.',
    ifT: (x: string, y: string) => `${x} → ${y} 인터페이스 신설`,
    ifD: '두 시스템 사이에 API/배치 인터페이스를 두어 재입력을 없애고, 인터페이스 카탈로그에 IF-ID로 등록해 테스트 범위에 포함합니다.',
    ruleT: (l: string) => `분기 "${l}" 규칙 엔진화`,
    ruleD:
      '판단 기준을 명시적 규칙(금액·등급·기한)으로 정의해 자동 분기하고, 규칙 밖 건만 사람이 판단합니다. 조건 라벨도 구체적으로 수정하세요.',
    loopFixT: '재작업 루프 사전 검증',
    loopFixD:
      '되돌아가는 원인(누락·오입력)을 앞 단계에서 자동 검증(필수값·형식·중복 체크)해 반려율을 낮춥니다.',
    mergeT: (a: string, b: string) => `"${a}"·"${b}" 단계 병합`,
    mergeD:
      '같은 시스템에서 연속 수행되는 단계는 한 화면/한 트랜잭션으로 합쳐 전환 비용을 줄입니다.',
    monitorT: '구간 모니터링·검증 지점 추가',
    monitorD: '구간 끝에 결과 검증(건수·금액 대사)과 처리 시간 지표를 두어 이상을 바로 감지합니다.',
    agentMonitor:
      '역할: 프로세스 모니터링 에이전트 · 입력: 단계별 처리 로그 · 출력: 지연·이상 알림과 원인 요약 · HITL: 알림 수신자가 조치 결정',
  },
  en: {
    summary: (n: number, manual: number, boundaries: number) =>
      `Of ${n} steps in scope, ${manual} run manually without a system and ${boundaries} transitions cross a system boundary. Replacing manual hand-offs with automation/AI agents and adding interfaces at system boundaries are the top priorities.`,
    manualT: 'Manual step',
    manualD: (l: string) =>
      `"${l}" has no system assigned, so it is done by hand with high cycle-time variance and input-error risk.`,
    boundaryT: 'System boundary without interface',
    boundaryD: (a: string, b: string, x: string, y: string) =>
      `"${a}" (${x}) → "${b}" (${y}) has no mapped interface; data likely moves through a person.`,
    loopT: 'Rework loop',
    loopD: (l: string) =>
      `A loop back from "${l}" means each rejection repeats earlier steps and stretches lead time.`,
    decisionT: 'Decision without explicit criteria',
    decisionD: (l: string) =>
      `Decision "${l}" has empty or vague branch labels, so outcomes depend on the person judging.`,
    chainT: 'Long sequential run without checks',
    chainD: (n: number) =>
      `${n} steps run in sequence without any decision or validation, so errors surface late.`,
    timerT: 'Waiting step',
    timerD: (l: string) =>
      `"${l}" is non-value-adding wait time. Check whether the reason (approval, external reply) can be shortened.`,
    agentT: (l: string) => `AI agent for "${l}"`,
    agentD:
      'An LLM agent reads the incoming documents/requests, classifies, extracts and drafts; the owner only reviews/approves.',
    agentA: (l: string, sys: string) =>
      `Role: ${l} agent · Input: request docs/emails/forms · Output: structured data for ${sys || 'the target system'} + summary · Tools: ${sys || 'system'} API, document parser · HITL: low-confidence cases routed to a review queue`,
    rpaT: (l: string) => `Automate "${l}" (RPA/workflow)`,
    rpaD: 'Rule-based entry/transfer work runs via RPA or a workflow engine; people handle exceptions only.',
    ifT: (x: string, y: string) => `New ${x} → ${y} interface`,
    ifD: 'Add an API/batch interface between the systems to remove re-keying; register it as an IF-ID in the interface catalog so it is covered by tests.',
    ruleT: (l: string) => `Rule engine for decision "${l}"`,
    ruleD:
      'Define explicit criteria (amount, grade, deadline) so the branch is taken automatically; only out-of-rule cases go to a person. Make the branch labels concrete.',
    loopFixT: 'Validate before the rework loop',
    loopFixD:
      'Catch the causes of rejection (missing/invalid input) with automatic validation upstream to cut the rework rate.',
    mergeT: (a: string, b: string) => `Merge "${a}" and "${b}"`,
    mergeD:
      'Consecutive steps in the same system can be one screen/transaction to remove hand-off cost.',
    monitorT: 'Add monitoring and a validation checkpoint',
    monitorD:
      'Reconcile results (counts/amounts) and track cycle time at the end of the scope so anomalies are caught immediately.',
    agentMonitor:
      'Role: process-monitoring agent · Input: step logs · Output: delay/anomaly alerts with cause summary · HITL: recipient decides on action',
  },
};

export function mockDiagnose(req: DiagnoseRequest): Diagnosis {
  const lang = req.language === 'en' ? 'en' : 'ko';
  const t = T[lang];
  const nodes = req.flow.nodes ?? [];
  const edges = req.flow.edges ?? [];
  const inScope = (id: string) => req.scope.length === 0 || req.scope.includes(id);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const scoped = nodes.filter(
    (n) => inScope(n.id) && !['start', 'end', 'annotation'].includes(n.type),
  );
  const order = new Map(nodes.map((n, i) => [n.id, i]));
  const sys = (n: AIFlowNode | undefined) => n?.system?.trim() ?? '';
  const findings: DiagnosisFinding[] = [];
  const improvements: DiagnosisImprovement[] = [];

  const manual = scoped.filter((n) => ['task', 'data'].includes(n.type) && !sys(n));
  for (const n of manual.slice(0, 3))
    findings.push({
      severity: 'high',
      title: t.manualT,
      detail: t.manualD(n.label),
      nodeIds: [n.id],
    });
  if (manual[0]) {
    const next = edges.find((e) => e.source === manual[0].id);
    const target = next ? sys(byId.get(next.target)) : '';
    improvements.push({
      kind: 'ai-agent',
      title: t.agentT(manual[0].label),
      detail: t.agentD,
      agent: t.agentA(manual[0].label, target),
      effort: 'medium',
      nodeIds: [manual[0].id],
    });
  }
  if (manual[1])
    improvements.push({
      kind: 'automation',
      title: t.rpaT(manual[1].label),
      detail: t.rpaD,
      effort: 'low',
      nodeIds: [manual[1].id],
    });

  let boundaries = 0;
  for (const e of edges) {
    if (!inScope(e.source) && !inScope(e.target)) continue;
    const a = byId.get(e.source);
    const b = byId.get(e.target);
    const x = sys(a);
    const y = sys(b);
    if (!a || !b || !x || !y || x.toLowerCase() === y.toLowerCase()) continue;
    boundaries++;
    if (req.interfaces?.[`${e.source}->${e.target}`]) continue;
    if (findings.length < 6)
      findings.push({
        severity: 'medium',
        title: t.boundaryT,
        detail: t.boundaryD(a.label, b.label, x, y),
        nodeIds: [a.id, b.id],
      });
    if (!improvements.some((i) => i.kind === 'system'))
      improvements.push({
        kind: 'system',
        title: t.ifT(x, y),
        detail: t.ifD,
        effort: 'high',
        nodeIds: [a.id, b.id],
      });
  }

  const loop = edges.find(
    (e) => inScope(e.source) && (order.get(e.target) ?? 0) < (order.get(e.source) ?? 0),
  );
  if (loop) {
    const src = byId.get(loop.source);
    findings.push({
      severity: 'medium',
      title: t.loopT,
      detail: t.loopD(src?.label ?? loop.source),
      nodeIds: [loop.source, loop.target],
    });
    improvements.push({
      kind: 'control',
      title: t.loopFixT,
      detail: t.loopFixD,
      effort: 'low',
      nodeIds: [loop.target],
    });
  }

  const vague = scoped.find(
    (n) =>
      n.type === 'decision' &&
      edges
        .filter((e) => e.source === n.id)
        .some((e) => !e.label?.trim() || /^(예|아니오|yes|no)$/i.test(e.label.trim())),
  );
  if (vague) {
    findings.push({
      severity: 'low',
      title: t.decisionT,
      detail: t.decisionD(vague.label),
      nodeIds: [vague.id],
    });
    improvements.push({
      kind: 'automation',
      title: t.ruleT(vague.label),
      detail: t.ruleD,
      effort: 'medium',
      nodeIds: [vague.id],
    });
  }

  const timer = scoped.find((n) => n.type === 'timer');
  if (timer)
    findings.push({
      severity: 'low',
      title: t.timerT,
      detail: t.timerD(timer.label),
      nodeIds: [timer.id],
    });

  const seqTasks = scoped.filter((n) => n.type === 'task');
  if (seqTasks.length >= 4 && !scoped.some((n) => n.type === 'decision'))
    findings.push({
      severity: 'low',
      title: t.chainT,
      detail: t.chainD(seqTasks.length),
      nodeIds: seqTasks.map((n) => n.id),
    });
  for (let i = 0; i + 1 < seqTasks.length; i++) {
    const a = seqTasks[i];
    const b = seqTasks[i + 1];
    if (
      sys(a) &&
      sys(a).toLowerCase() === sys(b).toLowerCase() &&
      edges.some((e) => e.source === a.id && e.target === b.id)
    ) {
      improvements.push({
        kind: 'process',
        title: t.mergeT(a.label, b.label),
        detail: t.mergeD,
        effort: 'low',
        nodeIds: [a.id, b.id],
      });
      break;
    }
  }

  improvements.push({
    kind: 'ai-agent',
    title: t.monitorT,
    detail: t.monitorD,
    agent: t.agentMonitor,
    effort: 'medium',
    nodeIds: scoped.slice(-1).map((n) => n.id),
  });

  return {
    summary: t.summary(scoped.length, manual.length, boundaries),
    findings: findings.slice(0, 6),
    improvements: improvements.slice(0, 6),
  };
}

/* ------------------------------------------------------------------ */
/* Validation of model output                                          */
/* ------------------------------------------------------------------ */

const str = (v: unknown, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const ids = (v: unknown, valid: Set<string>) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && valid.has(x)) : [];

export function sanitizeDiagnosis(raw: unknown, flow: AIFlowResponse): Diagnosis | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const valid = new Set((flow.nodes ?? []).map((n) => n.id));
  const findings: DiagnosisFinding[] = (Array.isArray(r.findings) ? r.findings : [])
    .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
    .map((f) => ({
      severity: SEVERITIES.includes(f.severity as FindingSeverity)
        ? (f.severity as FindingSeverity)
        : 'medium',
      title: str(f.title, 200),
      detail: str(f.detail),
      nodeIds: ids(f.nodeIds, valid),
    }))
    .filter((f) => f.title)
    .slice(0, 10);
  const improvements: DiagnosisImprovement[] = (Array.isArray(r.improvements) ? r.improvements : [])
    .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
    .map((f) => ({
      kind: IMPROVEMENT_KINDS.includes(f.kind as ImprovementKind)
        ? (f.kind as ImprovementKind)
        : 'process',
      title: str(f.title, 200),
      detail: str(f.detail),
      agent: str(f.agent) || undefined,
      effort: (['low', 'medium', 'high'] as ImprovementEffort[]).includes(
        f.effort as ImprovementEffort,
      )
        ? (f.effort as ImprovementEffort)
        : 'medium',
      nodeIds: ids(f.nodeIds, valid),
    }))
    .filter((f) => f.title)
    .slice(0, 10);
  const summary = str(r.summary);
  if (!summary && !findings.length && !improvements.length) return null;
  return { summary, findings, improvements };
}
