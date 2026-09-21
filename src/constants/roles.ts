import type { RoleDefinition, RoleType } from '../types/role';

export const ROLES: RoleDefinition[] = [
  {
    id: 'operations',
    label: { ko: '현업 담당자', en: 'Operations' },
    description: {
      ko: '업무 단계·담당부서·소요시간 중심의 실무 플로우',
      en: 'Step-by-step flows with owners and durations',
    },
    icon: '🧑‍💼',
    accent: '#3B82F6',
  },
  {
    id: 'pm',
    label: { ko: 'PM / 기획자', en: 'PM / Planner' },
    description: {
      ko: '마일스톤·의존관계·리스크 포인트 강조',
      en: 'Milestones, dependencies and risk points',
    },
    icon: '📋',
    accent: '#F59E0B',
  },
  {
    id: 'developer',
    label: { ko: '개발자', en: 'Developer' },
    description: {
      ko: 'API 호출·데이터 흐름·에러 핸들링 분기',
      en: 'API calls, data flow and error handling',
    },
    icon: '💻',
    accent: '#06B6D4',
  },
  {
    id: 'executive',
    label: { ko: '경영진', en: 'Executive' },
    description: {
      ko: '고수준 요약과 의사결정·KPI 포인트',
      en: 'High-level summary with decision and KPI points',
    },
    icon: '📈',
    accent: '#8B5CF6',
  },
  {
    id: 'consultant',
    label: { ko: '컨설턴트 / SI', en: 'Consultant / SI' },
    description: {
      ko: 'As-Is 프로세스 맵핑, 역할/레인 구분',
      en: 'As-Is process mapping with roles and lanes',
    },
    icon: '🗺️',
    accent: '#10B981',
  },
];

export const ROLE_MAP: Record<RoleType, RoleDefinition> = Object.fromEntries(
  ROLES.map((r) => [r.id, r]),
) as Record<RoleType, RoleDefinition>;

export const DEFAULT_ROLE: RoleType = 'operations';
