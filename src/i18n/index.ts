import { create } from 'zustand';

export type Language = 'ko' | 'en';

const STRINGS = {
  appName: { ko: 'BusinessFlowDesk', en: 'BusinessFlowDesk' },
  tagline: { ko: '말로 설명하면, 플로우가 그려진다', en: 'Describe it, and the flow draws itself' },
  untitled: { ko: '제목 없는 플로우', en: 'Untitled flow' },
  generate: { ko: '생성', en: 'Generate' },
  modify: { ko: '수정', en: 'Modify' },
  generating: { ko: 'AI가 플로우를 그리고 있어요…', en: 'AI is drawing your flow…' },
  promptPlaceholder: {
    ko: '플로우를 설명해주세요… (Enter: 전송, Shift+Enter: 줄바꿈)',
    en: 'Describe your flow… (Enter to send, Shift+Enter for newline)',
  },
  promptPlaceholderModify: {
    ko: '기존 플로우를 어떻게 바꿀까요? 예) 여기에 검수 단계를 추가해줘',
    en: 'How should the flow change? e.g. add a review step',
  },
  newFlow: { ko: '새 플로우', en: 'New flow' },
  role: { ko: '직군', en: 'Role' },
  export: { ko: '내보내기', en: 'Export' },
  exportPng: { ko: 'PNG 이미지', en: 'PNG image' },
  shareLink: { ko: '공유 링크 복사', en: 'Copy share link' },
  shareCopied: { ko: '공유 링크를 복사했어요', en: 'Share link copied' },
  sharedNotice: {
    ko: '공유 링크에서 플로우를 불러왔어요. 내 플로우에 복사본이 저장됩니다.',
    en: 'Loaded a flow from a share link. A copy is saved to My flows.',
  },
  sharedInvalid: { ko: '공유 링크를 읽을 수 없어요', en: 'Could not read the share link' },
  exportSvg: { ko: 'SVG 벡터', en: 'SVG vector' },
  exportPptx: { ko: 'PPTX 슬라이드', en: 'PPTX slides' },
  exportJson: { ko: 'JSON 백업', en: 'JSON backup' },
  exportMermaid: { ko: 'Mermaid (.mmd)', en: 'Mermaid (.mmd)' },
  exportMarkdown: { ko: 'Markdown 문서', en: 'Markdown document' },
  importJson: { ko: 'JSON 불러오기', en: 'Import JSON' },
  templates: { ko: '템플릿 갤러리', en: 'Template gallery' },
  templatesHint: {
    ko: '자주 쓰는 업무 플로우를 골라 바로 시작하고, 프롬프트로 수정하세요.',
    en: 'Start from a common business flow, then refine it with prompts.',
  },
  templateSearch: { ko: '템플릿 검색…', en: 'Search templates…' },
  templateOnlyMyRole: { ko: '내 직군만', en: 'My role only' },
  templateRecommended: { ko: '추천', en: 'Recommended' },
  templateNoResults: { ko: '일치하는 템플릿이 없어요', en: 'No matching templates' },
  templateReplaceConfirm: {
    ko: '템플릿을 새 플로우로 열겠습니다. 현재 플로우는 내 플로우에 저장된 상태로 유지됩니다. 계속할까요?',
    en: 'The template opens as a new flow. Your current flow stays saved in My flows. Continue?',
  },
  nodesCount: { ko: '노드', en: 'nodes' },
  emptyOrTemplate: { ko: '또는 템플릿에서 시작', en: 'or start from a template' },
  palette: { ko: '노드 팔레트', en: 'Node palette' },
  paletteHint: {
    ko: '캔버스로 드래그하거나 클릭해서 추가',
    en: 'Drag onto canvas or click to add',
  },
  basic: { ko: '기본', en: 'Basic' },
  advanced: { ko: '고급', en: 'Advanced' },
  properties: { ko: '속성', en: 'Properties' },
  noSelection: {
    ko: '노드를 선택하면 속성을 편집할 수 있어요',
    en: 'Select a node to edit its properties',
  },
  label: { ko: '라벨', en: 'Label' },
  description: { ko: '설명', en: 'Description' },
  department: { ko: '담당부서', en: 'Department' },
  system: { ko: '관련 시스템', en: 'System' },
  systemPlaceholder: { ko: 'ERP, CRM, 결제 PG …', en: 'ERP, CRM, payment gateway …' },
  estimatedTime: { ko: '예상 소요시간', en: 'Estimated time' },
  color: { ko: '노드 색상', en: 'Node color' },
  nodeType: { ko: '노드 타입', en: 'Node type' },
  delete: { ko: '삭제', en: 'Delete' },
  edgeLabel: { ko: '조건 라벨', en: 'Condition label' },
  edgeStyle: { ko: '선 스타일', en: 'Line style' },
  solid: { ko: '실선', en: 'Solid' },
  dashed: { ko: '점선', en: 'Dashed' },
  undo: { ko: '실행 취소 (Ctrl+Z)', en: 'Undo (Ctrl+Z)' },
  redo: { ko: '다시 실행 (Ctrl+Y)', en: 'Redo (Ctrl+Y)' },
  autoLayout: { ko: '자동 정렬', en: 'Auto layout' },
  direction: { ko: '방향 전환', en: 'Toggle direction' },
  fitView: { ko: '화면 맞춤', en: 'Fit view' },
  swimlanes: { ko: '스윔레인 (부서별 레인)', en: 'Swimlanes (by department)' },
  systemLanes: { ko: '시스템 레인 (시스템별 그루핑)', en: 'System lanes (group by system)' },
  unassignedLane: { ko: '미지정', en: 'Unassigned' },
  noSystemLane: { ko: '수작업 / 시스템 없음', en: 'Manual / no system' },
  projects: { ko: '내 플로우', en: 'My flows' },
  deleteProject: { ko: '이 플로우 삭제', en: 'Delete this flow' },
  confirmDeleteProject: { ko: '이 플로우를 삭제할까요?', en: 'Delete this flow?' },
  storageWarning: {
    ko: '저장된 플로우가 10개를 넘었어요. 오래된 플로우는 정리하는 것을 권장합니다.',
    en: 'More than 10 flows saved. Consider removing old ones.',
  },
  chooseRole: { ko: '어떤 관점으로 플로우를 그릴까요?', en: 'Which perspective should we use?' },
  chooseRoleHint: {
    ko: '직군에 따라 노드 깊이·용어·강조 포인트가 달라집니다. 나중에 헤더에서 바꿀 수 있어요.',
    en: 'Node depth, terminology and emphasis change by role. You can switch later in the header.',
  },
  start: { ko: '시작하기', en: 'Get started' },
  mockNotice: {
    ko: 'API 키가 없어 데모 모드(로컬 규칙 기반)로 생성했어요. CLAUDE_API_KEY를 설정하면 AI가 생성합니다.',
    en: 'No API key: generated in demo mode (local heuristics). Set CLAUDE_API_KEY to use AI.',
  },
  errorGeneric: {
    ko: '플로우 생성에 실패했어요. 다시 시도해주세요.',
    en: 'Failed to generate the flow. Please try again.',
  },
  emptyCanvas: {
    ko: '아래 프롬프트 바에 업무를 설명하거나, 왼쪽 팔레트에서 노드를 끌어와 시작하세요.',
    en: 'Describe a process in the prompt bar below, or drag a node from the palette to start.',
  },
  mobileViewer: { ko: '모바일에서는 보기 전용입니다', en: 'View-only on mobile' },
  yes: { ko: '예', en: 'Yes' },
  no: { ko: '아니오', en: 'No' },
  collapse: { ko: '접기', en: 'Collapse' },
  expand: { ko: '펼치기', en: 'Expand' },
  language: { ko: '언어', en: 'Language' },
  editTitle: { ko: '제목 편집', en: 'Edit title' },
  nodes: { ko: '노드', en: 'nodes' },
  edges: { ko: '연결', en: 'edges' },
  editEdgeLabel: { ko: '조건 라벨 입력', en: 'Enter condition label' },
} as const;

export type StringKey = keyof typeof STRINGS;

interface I18nState {
  language: Language;
  setLanguage: (l: Language) => void;
}

const LANG_KEY = 'bfd_language';

function detectLanguage(): Language {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(LANG_KEY) : null;
  if (saved === 'ko' || saved === 'en') return saved;
  if (typeof navigator !== 'undefined' && navigator.language.startsWith('ko')) return 'ko';
  return 'ko';
}

export const useI18n = create<I18nState>((set) => ({
  language: detectLanguage(),
  setLanguage: (language) => {
    localStorage.setItem(LANG_KEY, language);
    set({ language });
  },
}));

export function useT() {
  const language = useI18n((s) => s.language);
  return (key: StringKey) => STRINGS[key][language];
}

export function t(key: StringKey, language: Language) {
  return STRINGS[key][language];
}
