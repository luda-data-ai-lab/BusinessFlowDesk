import type { Language } from '../i18n';
import type { AIFlowResponse, NodeType } from '../types/flow';
import type { RoleType } from '../types/role';

type L = { ko: string; en: string };

interface TemplateNode {
  id: string;
  type: NodeType;
  label: L;
  department?: L;
  system?: L;
  estimatedTime?: string;
  description?: L;
}

interface TemplateEdge {
  source: string;
  target: string;
  label?: L;
}

export interface FlowTemplate {
  id: string;
  icon: string;
  name: L;
  description: L;
  roles: RoleType[];
  nodes: TemplateNode[];
  edges: TemplateEdge[];
}

const YES: L = { ko: '예', en: 'Yes' };
const NO: L = { ko: '아니오', en: 'No' };

const n = (
  id: string,
  type: NodeType,
  ko: string,
  en: string,
  extra: Partial<Omit<TemplateNode, 'id' | 'type' | 'label'>> & { dept?: L; sys?: L } = {},
): TemplateNode => ({
  id,
  type,
  label: { ko, en },
  department: extra.dept,
  system: extra.sys,
  estimatedTime: extra.estimatedTime,
  description: extra.description,
});
const e = (source: string, target: string, label?: L): TemplateEdge => ({ source, target, label });

const D = {
  sales: { ko: '영업팀', en: 'Sales' },
  ops: { ko: '운영팀', en: 'Operations' },
  finance: { ko: '재무팀', en: 'Finance' },
  logistics: { ko: '물류팀', en: 'Logistics' },
  cs: { ko: 'CS팀', en: 'Customer Support' },
  hr: { ko: '인사팀', en: 'HR' },
  hiring: { ko: '채용 부서', en: 'Hiring team' },
  pm: { ko: 'PM', en: 'PM' },
  design: { ko: '디자인팀', en: 'Design' },
  dev: { ko: '개발팀', en: 'Engineering' },
  qa: { ko: 'QA팀', en: 'QA' },
  devops: { ko: 'DevOps', en: 'DevOps' },
  exec: { ko: '경영진', en: 'Executives' },
  legal: { ko: '법무팀', en: 'Legal' },
  consult: { ko: '컨설턴트', en: 'Consultant' },
  client: { ko: '고객사', en: 'Client' },
};

const S = {
  shop: { ko: '쇼핑몰', en: 'Storefront' },
  erp: { ko: 'ERP', en: 'ERP' },
  wms: { ko: 'WMS', en: 'WMS' },
  pg: { ko: '결제 PG', en: 'Payment gateway' },
  msg: { ko: '알림톡/SMS', en: 'Messaging' },
  git: { ko: 'GitHub', en: 'GitHub' },
  ci: { ko: 'CI 서버', en: 'CI server' },
  k8s: { ko: 'Kubernetes', en: 'Kubernetes' },
  apm: { ko: 'APM/모니터링', en: 'APM / monitoring' },
};

export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: 'order-to-delivery',
    icon: '📦',
    name: { ko: '주문–배송 프로세스', en: 'Order to delivery' },
    description: {
      ko: '주문 접수부터 재고 확인, 결제, 출고, 배송 완료 알림까지',
      en: 'From order intake through stock check, payment, fulfilment and delivery notice',
    },
    roles: ['operations', 'executive'],
    nodes: [
      n('s', 'start', '주문 접수', 'Order received', { sys: S.shop }),
      n('t1', 'task', '주문 정보 확인', 'Validate order', {
        dept: D.sales,
        sys: S.erp,
        estimatedTime: '10min',
      }),
      n('d1', 'decision', '재고 있음?', 'In stock?', { dept: D.ops, sys: S.wms }),
      n('t2', 'task', '입고 요청 / 고객 안내', 'Backorder & notify customer', {
        dept: D.ops,
        sys: S.erp,
        estimatedTime: '1d',
      }),
      n('t3', 'system', '결제 승인 (PG)', 'Payment authorization (PG)', {
        dept: D.finance,
        sys: S.pg,
      }),
      n('d2', 'decision', '결제 성공?', 'Payment ok?', { dept: D.finance, sys: S.pg }),
      n('t4', 'task', '결제 실패 안내', 'Payment failure notice', { dept: D.cs, sys: S.msg }),
      n('t5', 'task', '피킹 · 패킹', 'Pick & pack', {
        dept: D.logistics,
        sys: S.wms,
        estimatedTime: '2h',
      }),
      n('t6', 'task', '택배 출고', 'Ship via carrier', {
        dept: D.logistics,
        sys: S.wms,
        estimatedTime: '1d',
      }),
      n('t7', 'system', '배송 완료 알림 발송', 'Send delivery notification', {
        dept: D.cs,
        sys: S.msg,
      }),
      n('e', 'end', '완료', 'Done'),
    ],
    edges: [
      e('s', 't1'),
      e('t1', 'd1'),
      e('d1', 't2', NO),
      e('t2', 'd1'),
      e('d1', 't3', YES),
      e('t3', 'd2'),
      e('d2', 't4', NO),
      e('t4', 'e'),
      e('d2', 't5', YES),
      e('t5', 't6'),
      e('t6', 't7'),
      e('t7', 'e'),
    ],
  },
  {
    id: 'customer-claim',
    icon: '🎧',
    name: { ko: '고객 클레임 처리', en: 'Customer complaint handling' },
    description: {
      ko: '접수 → 분류 → 1차 응대 → 에스컬레이션 → 보상/종결',
      en: 'Intake → triage → first response → escalation → remedy & close',
    },
    roles: ['operations', 'pm'],
    nodes: [
      n('s', 'start', '클레임 접수', 'Complaint received'),
      n('t1', 'task', '유형 분류 · 티켓 생성', 'Classify & open ticket', {
        dept: D.cs,
        estimatedTime: '15min',
      }),
      n('d1', 'decision', '1차 상담으로 해결?', 'Resolved at first contact?', { dept: D.cs }),
      n('t2', 'task', '담당 부서 에스컬레이션', 'Escalate to owning team', {
        dept: D.cs,
        estimatedTime: '1d',
      }),
      n('t3', 'task', '원인 조사', 'Investigate root cause', { dept: D.ops, estimatedTime: '2d' }),
      n('d2', 'decision', '보상 필요?', 'Compensation needed?', { dept: D.ops }),
      n('t4', 'task', '보상 승인 · 지급', 'Approve & pay compensation', { dept: D.finance }),
      n('t5', 'task', '고객 회신 · 종결', 'Reply to customer & close', { dept: D.cs }),
      n('t6', 'data', '재발 방지 기록', 'Log prevention action', { dept: D.ops }),
      n('e', 'end', '종결', 'Closed'),
    ],
    edges: [
      e('s', 't1'),
      e('t1', 'd1'),
      e('d1', 't5', YES),
      e('d1', 't2', NO),
      e('t2', 't3'),
      e('t3', 'd2'),
      e('d2', 't4', YES),
      e('t4', 't5'),
      e('d2', 't5', NO),
      e('t5', 't6'),
      e('t6', 'e'),
    ],
  },
  {
    id: 'hiring',
    icon: '🧑‍💼',
    name: { ko: '채용 프로세스', en: 'Hiring process' },
    description: {
      ko: '공고 → 서류 → 면접 → 처우 협의 → 입사',
      en: 'Posting → screening → interviews → offer → onboarding',
    },
    roles: ['operations', 'executive'],
    nodes: [
      n('s', 'start', '채용 요청', 'Hiring request'),
      n('t1', 'task', '채용 공고 게시', 'Publish job posting', { dept: D.hr, estimatedTime: '2d' }),
      n('t2', 'task', '서류 검토', 'Resume screening', { dept: D.hiring, estimatedTime: '3d' }),
      n('d1', 'decision', '서류 통과?', 'Pass screening?', { dept: D.hiring }),
      n('t3', 'task', '불합격 통보', 'Send rejection', { dept: D.hr }),
      n('t4', 'task', '1차 면접 (실무)', 'Technical interview', {
        dept: D.hiring,
        estimatedTime: '1h',
      }),
      n('t5', 'task', '2차 면접 (임원)', 'Final interview', { dept: D.exec, estimatedTime: '1h' }),
      n('d2', 'decision', '최종 합격?', 'Offer?', { dept: D.exec }),
      n('t6', 'task', '처우 협의 · 오퍼', 'Negotiate & send offer', {
        dept: D.hr,
        estimatedTime: '3d',
      }),
      n('t7', 'subprocess', '입사 온보딩', 'Onboarding', { dept: D.hr }),
      n('e', 'end', '채용 완료', 'Hired'),
    ],
    edges: [
      e('s', 't1'),
      e('t1', 't2'),
      e('t2', 'd1'),
      e('d1', 't3', NO),
      e('t3', 'e'),
      e('d1', 't4', YES),
      e('t4', 't5'),
      e('t5', 'd2'),
      e('d2', 't3', NO),
      e('d2', 't6', YES),
      e('t6', 't7'),
      e('t7', 'e'),
    ],
  },
  {
    id: 'feature-delivery',
    icon: '🚀',
    name: { ko: '신규 기능 기획–출시', en: 'Feature discovery to launch' },
    description: {
      ko: '요구사항 수집, PRD, 디자인, 개발, QA, 출시 리뷰',
      en: 'Requirements, PRD, design, build, QA and launch review',
    },
    roles: ['pm', 'developer'],
    nodes: [
      n('s', 'start', '아이디어 / 요청', 'Idea / request'),
      n('t1', 'task', '요구사항 수집 · 우선순위', 'Gather & prioritise requirements', {
        dept: D.pm,
        estimatedTime: '1w',
      }),
      n('t2', 'data', 'PRD 작성', 'Write PRD', { dept: D.pm, estimatedTime: '3d' }),
      n('d1', 'decision', '기획 리뷰 승인?', 'PRD approved?', { dept: D.exec }),
      n('p', 'parallel', '병행 진행', 'In parallel'),
      n('t3', 'task', 'UX/UI 디자인', 'UX/UI design', { dept: D.design, estimatedTime: '1w' }),
      n('t4', 'task', '기술 설계', 'Technical design', { dept: D.dev, estimatedTime: '3d' }),
      n('t5', 'task', '개발 (스프린트)', 'Implementation (sprints)', {
        dept: D.dev,
        estimatedTime: '2w',
      }),
      n('t6', 'task', 'QA · 버그 수정', 'QA & bug fixing', { dept: D.qa, estimatedTime: '1w' }),
      n('d2', 'decision', '출시 기준 충족?', 'Meets launch criteria?', { dept: D.pm }),
      n('t7', 'task', '출시 · 공지', 'Release & announce', { dept: D.pm }),
      n('t8', 'timer', '2주 후 지표 리뷰', 'Metrics review after 2 weeks', { dept: D.pm }),
      n('e', 'end', '완료', 'Done'),
    ],
    edges: [
      e('s', 't1'),
      e('t1', 't2'),
      e('t2', 'd1'),
      e('d1', 't1', NO),
      e('d1', 'p', YES),
      e('p', 't3'),
      e('p', 't4'),
      e('t3', 't5'),
      e('t4', 't5'),
      e('t5', 't6'),
      e('t6', 'd2'),
      e('d2', 't5', NO),
      e('d2', 't7', YES),
      e('t7', 't8'),
      e('t8', 'e'),
    ],
  },
  {
    id: 'ci-cd',
    icon: '⚙️',
    name: { ko: 'CI/CD 배포 파이프라인', en: 'CI/CD deployment pipeline' },
    description: {
      ko: 'PR → 자동 테스트 → 코드 리뷰 → 스테이징 → 프로덕션 배포 → 모니터링',
      en: 'PR → automated tests → review → staging → production → monitoring',
    },
    roles: ['developer'],
    nodes: [
      n('s', 'start', 'PR 생성', 'Open PR', { sys: S.git }),
      n('t1', 'system', 'CI: 린트 · 테스트 · 빌드', 'CI: lint, test, build', {
        dept: D.devops,
        sys: S.ci,
        estimatedTime: '10min',
      }),
      n('d1', 'decision', 'CI 통과?', 'CI green?', { dept: D.devops, sys: S.ci }),
      n('t2', 'task', '수정 후 재푸시', 'Fix & push', { dept: D.dev, sys: S.git }),
      n('t3', 'task', '코드 리뷰', 'Code review', { dept: D.dev, sys: S.git, estimatedTime: '1d' }),
      n('d2', 'decision', '승인?', 'Approved?', { dept: D.dev, sys: S.git }),
      n('t4', 'system', 'main 머지 · 스테이징 배포', 'Merge & deploy to staging', {
        dept: D.devops,
        sys: S.k8s,
      }),
      n('t5', 'task', '스테이징 검증 (QA)', 'Staging verification', {
        dept: D.qa,
        estimatedTime: '2h',
      }),
      n('d3', 'decision', '프로덕션 배포 승인?', 'Approve production?', { dept: D.pm }),
      n('t6', 'system', '프로덕션 배포 (카나리)', 'Production deploy (canary)', {
        dept: D.devops,
        sys: S.k8s,
      }),
      n('t7', 'timer', '30분 모니터링', 'Monitor for 30 min', { dept: D.devops, sys: S.apm }),
      n('d4', 'decision', '에러율 정상?', 'Error rate normal?', { dept: D.devops, sys: S.apm }),
      n('t8', 'task', '롤백', 'Rollback', { dept: D.devops, sys: S.k8s }),
      n('e', 'end', '배포 완료', 'Released'),
    ],
    edges: [
      e('s', 't1'),
      e('t1', 'd1'),
      e('d1', 't2', NO),
      e('t2', 't1'),
      e('d1', 't3', YES),
      e('t3', 'd2'),
      e('d2', 't2', NO),
      e('d2', 't4', YES),
      e('t4', 't5'),
      e('t5', 'd3'),
      e('d3', 't2', NO),
      e('d3', 't6', YES),
      e('t6', 't7'),
      e('t7', 'd4'),
      e('d4', 't8', NO),
      e('t8', 't2'),
      e('d4', 'e', YES),
    ],
  },
  {
    id: 'incident',
    icon: '🚨',
    name: { ko: '장애 대응 프로세스', en: 'Incident response' },
    description: {
      ko: '알림 → 심각도 판정 → 대응 → 복구 → 포스트모템',
      en: 'Alert → severity triage → mitigation → recovery → post-mortem',
    },
    roles: ['developer', 'operations'],
    nodes: [
      n('s', 'start', '모니터링 알림', 'Monitoring alert'),
      n('t1', 'task', '온콜 확인 · 심각도 판정', 'On-call acknowledges & triages', {
        dept: D.devops,
        estimatedTime: '10min',
      }),
      n('d1', 'decision', 'SEV1/2?', 'SEV1/2?', { dept: D.devops }),
      n('t2', 'task', '워룸 개설 · 이해관계자 공지', 'Open war room & notify stakeholders', {
        dept: D.pm,
      }),
      n('t3', 'task', '완화 조치 (롤백/스케일)', 'Mitigate (rollback / scale)', {
        dept: D.dev,
        estimatedTime: '30min',
      }),
      n('d2', 'decision', '서비스 복구?', 'Service restored?', { dept: D.devops }),
      n('t4', 'task', '고객 공지 · 상태 페이지 갱신', 'Customer notice & status page', {
        dept: D.cs,
      }),
      n('t5', 'task', '근본 원인 분석', 'Root cause analysis', {
        dept: D.dev,
        estimatedTime: '2d',
      }),
      n('t6', 'data', '포스트모템 문서', 'Post-mortem document', { dept: D.dev }),
      n('t7', 'task', '재발 방지 액션 아이템', 'Follow-up action items', { dept: D.pm }),
      n('e', 'end', '종료', 'Resolved'),
    ],
    edges: [
      e('s', 't1'),
      e('t1', 'd1'),
      e('d1', 't2', YES),
      e('t2', 't3'),
      e('d1', 't3', NO),
      e('t3', 'd2'),
      e('d2', 't3', NO),
      e('d2', 't4', YES),
      e('t4', 't5'),
      e('t5', 't6'),
      e('t6', 't7'),
      e('t7', 'e'),
    ],
  },
  {
    id: 'budget-approval',
    icon: '💰',
    name: { ko: '예산 · 지출 승인', en: 'Budget & spend approval' },
    description: {
      ko: '금액 구간별 결재선, 재무 검토, 집행, 정산',
      en: 'Tiered approvals by amount, finance review, execution and settlement',
    },
    roles: ['executive', 'operations'],
    nodes: [
      n('s', 'start', '지출 요청', 'Spend request'),
      n(
        't1',
        'task',
        '요청서 작성 (목적 · 금액 · 견적)',
        'Prepare request (purpose, amount, quote)',
        {
          dept: D.ops,
          estimatedTime: '1h',
        },
      ),
      n('t2', 'task', '팀장 검토', 'Manager review', { dept: D.ops, estimatedTime: '1d' }),
      n('d1', 'decision', '1천만 원 초과?', 'Over ₩10M?', { dept: D.finance }),
      n('t3', 'task', '임원 결재', 'Executive approval', { dept: D.exec, estimatedTime: '2d' }),
      n('d2', 'decision', '승인?', 'Approved?', { dept: D.exec }),
      n('t4', 'task', '반려 · 사유 통보', 'Reject with reason', { dept: D.finance }),
      n('t5', 'task', '재무 예산 확인', 'Finance budget check', {
        dept: D.finance,
        estimatedTime: '1d',
      }),
      n('t6', 'system', 'ERP 지출 등록 · 집행', 'Register & execute in ERP', { dept: D.finance }),
      n('t7', 'task', '증빙 · 정산', 'Receipts & settlement', { dept: D.ops }),
      n('e', 'end', '완료', 'Done'),
    ],
    edges: [
      e('s', 't1'),
      e('t1', 't2'),
      e('t2', 'd1'),
      e('d1', 't3', YES),
      e('t3', 'd2'),
      e('d1', 't5', NO),
      e('d2', 't4', NO),
      e('t4', 'e'),
      e('d2', 't5', YES),
      e('t5', 't6'),
      e('t6', 't7'),
      e('t7', 'e'),
    ],
  },
  {
    id: 'consulting-engagement',
    icon: '📑',
    name: { ko: '컨설팅 제안–계약–수행', en: 'Consulting engagement lifecycle' },
    description: {
      ko: 'RFP 접수, 제안, 계약, 현황 분석, 개선안 도출, 이행 지원',
      en: 'RFP intake, proposal, contract, as-is analysis, to-be design, implementation support',
    },
    roles: ['consultant', 'executive'],
    nodes: [
      n('s', 'start', 'RFP 접수', 'RFP received'),
      n('t1', 'task', '요건 분석 · Go/No-go', 'Qualify & go/no-go', {
        dept: D.consult,
        estimatedTime: '2d',
      }),
      n('d1', 'decision', '참여?', 'Pursue?', { dept: D.exec }),
      n('t2', 'task', '제안서 · 견적 작성', 'Proposal & pricing', {
        dept: D.consult,
        estimatedTime: '1w',
      }),
      n('t3', 'task', '제안 발표', 'Pitch presentation', { dept: D.consult }),
      n('d2', 'decision', '수주?', 'Awarded?', { dept: D.client }),
      n('t4', 'task', '계약 검토 · 체결', 'Contract review & signing', {
        dept: D.legal,
        estimatedTime: '1w',
      }),
      n('t5', 'task', '현황(As-Is) 분석', 'As-is analysis', {
        dept: D.consult,
        estimatedTime: '3w',
      }),
      n('t6', 'task', '개선안(To-Be) 설계', 'To-be design', {
        dept: D.consult,
        estimatedTime: '3w',
      }),
      n('t7', 'task', '고객 검토 워크숍', 'Client review workshop', { dept: D.client }),
      n('t8', 'subprocess', '이행 지원', 'Implementation support', { dept: D.consult }),
      n('e', 'end', '프로젝트 종료', 'Engagement closed'),
    ],
    edges: [
      e('s', 't1'),
      e('t1', 'd1'),
      e('d1', 'e', NO),
      e('d1', 't2', YES),
      e('t2', 't3'),
      e('t3', 'd2'),
      e('d2', 'e', NO),
      e('d2', 't4', YES),
      e('t4', 't5'),
      e('t5', 't6'),
      e('t6', 't7'),
      e('t7', 't8'),
      e('t8', 'e'),
    ],
  },
  {
    id: 'onboarding',
    icon: '🎒',
    name: { ko: '신규 입사자 온보딩', en: 'New hire onboarding' },
    description: {
      ko: '입사 전 준비, 첫날 세팅, 1주 교육, 30일 체크인',
      en: 'Pre-boarding, day-one setup, first-week training, 30-day check-in',
    },
    roles: ['operations', 'pm'],
    nodes: [
      n('s', 'start', '입사 확정', 'Offer accepted'),
      n('t1', 'task', '계정 · 장비 신청', 'Request accounts & equipment', {
        dept: D.hr,
        estimatedTime: '3d',
      }),
      n('t2', 'system', '계정 생성 (메일 · 협업툴)', 'Provision accounts', { dept: D.devops }),
      n('t3', 'task', '첫날 오리엔테이션', 'Day-one orientation', {
        dept: D.hr,
        estimatedTime: '2h',
      }),
      n('t4', 'task', '팀 소개 · 버디 배정', 'Team intro & buddy', { dept: D.ops }),
      n('t5', 'task', '1주차 직무 교육', 'Week-one job training', {
        dept: D.ops,
        estimatedTime: '1w',
      }),
      n('t6', 'timer', '30일 후', 'After 30 days'),
      n('t7', 'task', '30일 체크인 면담', '30-day check-in', { dept: D.hr }),
      n('d1', 'decision', '추가 지원 필요?', 'Needs extra support?', { dept: D.hr }),
      n('t8', 'task', '멘토링 · 교육 보강', 'Mentoring & extra training', { dept: D.ops }),
      n('e', 'end', '온보딩 완료', 'Onboarded'),
    ],
    edges: [
      e('s', 't1'),
      e('t1', 't2'),
      e('t2', 't3'),
      e('t3', 't4'),
      e('t4', 't5'),
      e('t5', 't6'),
      e('t6', 't7'),
      e('t7', 'd1'),
      e('d1', 't8', YES),
      e('t8', 'e'),
      e('d1', 'e', NO),
    ],
  },
];

export function templateToFlow(tpl: FlowTemplate, lang: Language): AIFlowResponse {
  return {
    title: tpl.name[lang],
    nodes: tpl.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      label: node.label[lang],
      department: node.department?.[lang],
      system: node.system?.[lang],
      estimatedTime: node.estimatedTime,
      description: node.description?.[lang],
    })),
    edges: tpl.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      label: edge.label?.[lang],
    })),
  };
}
