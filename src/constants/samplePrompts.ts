import type { RoleType } from '../types/role';

export const SAMPLE_PROMPTS: Record<RoleType, { ko: string[]; en: string[] }> = {
  operations: {
    ko: [
      '매월 정산 프로세스를 그려줘',
      '고객 주문 접수부터 출하까지 프로세스',
      '신입사원 온보딩 절차를 정리해줘',
    ],
    en: [
      'Draw the monthly settlement process',
      'Customer order intake to shipping process',
      'Outline the new-hire onboarding procedure',
    ],
  },
  pm: {
    ko: [
      '신규 서비스 런칭 프로젝트 흐름을 만들어줘',
      '기능 요청 접수부터 배포까지 승인 흐름',
      '분기별 로드맵 수립 프로세스를 그려줘',
    ],
    en: [
      'Create a new service launch project flow',
      'Approval flow from feature request to release',
      'Draw the quarterly roadmap planning process',
    ],
  },
  developer: {
    ko: [
      '사용자 인증 API 호출 흐름을 그려줘',
      '결제 승인 요청과 실패 재시도 로직',
      'CI/CD 파이프라인 단계를 정리해줘',
    ],
    en: [
      'Draw the user authentication API call flow',
      'Payment authorization with failure retry logic',
      'Outline the CI/CD pipeline stages',
    ],
  },
  executive: {
    ko: [
      '전사 구매 프로세스를 한눈에 보여줘',
      '신규 사업 투자 의사결정 흐름',
      '분기 실적 리뷰 프로세스를 요약해줘',
    ],
    en: [
      'Show the company-wide procurement process at a glance',
      'New business investment decision flow',
      'Summarize the quarterly performance review process',
    ],
  },
  consultant: {
    ko: [
      '고객사 As-Is 청구 프로세스를 맵핑해줘',
      '제조사 수주-생산-출하 프로세스를 레인별로 정리',
      '변경관리(Change Management) 프로세스를 그려줘',
    ],
    en: [
      'Map the client As-Is billing process',
      'Manufacturer order-production-shipping by lane',
      'Draw the change management process',
    ],
  },
};
