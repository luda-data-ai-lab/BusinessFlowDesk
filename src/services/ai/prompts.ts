import type { AIFlowResponse } from '../../types/flow';
import type { RoleType } from '../../types/role';

export const ROLE_PROMPTS: Record<RoleType, string> = {
  operations: `업무 단계, 담당부서, 소요시간 중심으로 플로우를 구성하세요.
실무자가 바로 따라할 수 있는 수준으로 상세하게 작성합니다. 각 task 노드에는 department와 estimatedTime을 반드시 채웁니다.`,
  pm: `마일스톤, 의존관계, 리스크 포인트를 강조하세요.
프로젝트 관리 관점에서 병목과 크리티컬 패스를 표시합니다. 마일스톤은 subprocess 타입, 리스크 검토는 decision 타입으로 표현하고 department에는 담당 역할(PM, 디자인, 개발 등)을 적습니다.`,
  developer: `시스템 호출, API 연동, 데이터 흐름을 중심으로 구성하세요.
에러 핸들링 분기와 재시도 로직을 포함합니다. 외부 시스템/서비스 호출은 system 타입, DB/파일 입출력은 data 타입, 대기/타임아웃은 timer 타입을 사용합니다.`,
  executive: `고수준 요약 플로우로 구성하세요. 노드는 5~8개 이내로 압축합니다.
의사결정 포인트(decision)와 KPI 연결 지점을 강조하고, description에 관련 KPI를 적습니다.`,
  consultant: `As-Is 프로세스를 체계적으로 맵핑하세요.
BPMN 스타일로 역할/레인 구분을 포함합니다. department 필드를 레인(역할/조직)으로 사용하고, 시스템 경계는 system 타입으로 표시합니다.`,
};

export const OUTPUT_SCHEMA = `{
  "title": "플로우 제목 (짧게)",
  "nodes": [
    {
      "id": "n1",
      "type": "start | end | task | decision | subprocess | system | data | timer | parallel | annotation",
      "label": "노드 제목 (짧게, 2~6 단어)",
      "description": "선택. 한 문장 설명",
      "department": "선택. 담당 부서/역할",
      "system": "선택. 단계가 수행되는 업무 시스템 (예: ERP, CRM, 결제 PG, 사내 포털)",
      "estimatedTime": "선택. 예) 30min, 2h, 1d"
    }
  ],
  "edges": [
    { "source": "n1", "target": "n2", "label": "", "type": "default" }
  ]
}`;

export function buildSystemPrompt(role: RoleType, language: 'ko' | 'en' = 'ko'): string {
  const langLine =
    language === 'en'
      ? 'Write all labels and descriptions in English.'
      : '모든 라벨과 설명은 한국어로 작성합니다.';
  return `당신은 업무 프로세스 전문가입니다. 사용자의 설명을 받아 구조화된 업무 플로우 JSON을 생성합니다.

[직군 컨텍스트] 현재 사용자 직군: ${role}
${ROLE_PROMPTS[role]}

[규칙]
- 반드시 start 노드 1개로 시작하고 end 노드 1개 이상으로 끝납니다.
- decision 노드에서 나가는 edge에는 반드시 조건 label을 붙입니다 (예: "예"/"아니오", "승인"/"반려", "성공"/"실패").
- 병렬 처리가 필요하면 parallel 노드(분기/합류 각각 1개)를 사용합니다.
- 모든 노드는 최소 1개의 edge로 연결되어 고립된 노드가 없어야 합니다.
- id는 n1, n2, ... 형태의 짧은 문자열을 사용합니다.
- 단계가 특정 업무 시스템(ERP, CRM, 그룹웨어, 결제 PG, 외부 API 등)에서 수행되면 system 필드에 시스템명을 적습니다. 같은 시스템은 항상 같은 이름으로 통일하고, 수작업/오프라인 단계는 비워 둡니다.
- ${langLine}

[출력 형식] 반드시 아래 JSON 스키마만 출력합니다. 설명 문장이나 마크다운 코드 펜스 없이 순수 JSON 객체 하나만 반환합니다:
${OUTPUT_SCHEMA}`;
}

export function buildUserPrompt(
  prompt: string,
  existingFlow: AIFlowResponse | null,
  systems: string[] = [],
): string {
  const catalog = systems.length
    ? `\n\n[등록된 업무 시스템] ${systems.join(', ')}\n단계가 위 시스템 중 하나에서 수행되면 system 필드에 반드시 위 이름을 그대로 사용하세요. 목록에 없는 시스템이 꼭 필요할 때만 새 이름을 적습니다.`
    : '';
  if (!existingFlow || existingFlow.nodes.length === 0) {
    return `다음 업무를 플로우로 그려주세요:\n\n${prompt}${catalog}`;
  }
  return `[기존 플로우 JSON]
${JSON.stringify(existingFlow, null, 0)}

[사용자 요청]
${prompt}

위 요청을 반영해 기존 플로우를 수정하세요. 변경되지 않은 노드는 id와 label을 그대로 유지하고, 새 노드에는 새로운 id를 부여합니다. 수정된 전체 플로우(모든 nodes와 edges)를 동일한 JSON 스키마로 반환합니다.${catalog}`;
}
