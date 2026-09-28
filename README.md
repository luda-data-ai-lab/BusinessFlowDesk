# BusinessFlowDesk

> 말로 설명하면, 플로우가 그려진다.

자연어로 업무를 설명하면 Claude가 업무 플로우를 생성하고, React Flow 캔버스에서 드래그·편집·내보내기까지 할 수 있는 웹앱입니다.

📘 사용법은 [사용자 매뉴얼](docs/USER_GUIDE.md)을 참고하세요.

## 주요 기능

- **AI 플로우 생성** — 프롬프트 → 노드/엣지 JSON → 자동 레이아웃(dagre)
- **직군별 시점** — 현업 담당자 / PM / 개발자 / 경영진 / 컨설턴트에 맞춘 시스템 프롬프트와 샘플 프롬프트
- **인터랙티브 캔버스** — 10종 커스텀 노드, 조건 분기(예/아니오) 엣지, 드래그&드롭 팔레트, 속성 패널, 인라인 라벨 편집, 미니맵, 줌/팬
- **증분 수정** — 기존 플로우를 유지한 채 "여기에 검수 단계 추가해줘" 같은 프롬프트로 수정
- **스윔레인** — 툴바 토글로 `담당부서`별 레인(TB: 열, LR: 행) 표시. 노드를 다른 레인으로 드래그하면 담당부서가 자동 변경
- **공유 링크** — 내보내기 메뉴의 `공유 링크 복사`. 플로우 전체가 URL 해시(`#share=`)에 deflate 압축되어 서버 없이 공유·열기 가능. 링크를 열면 내 플로우에 복사본으로 저장
- **Undo / Redo** — `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`, `Ctrl/Cmd+Y`
- **로컬 저장** — localStorage 자동 저장(1초 디바운스), 프로젝트 목록 관리
- **내보내기 / 가져오기** — PNG, SVG, JSON
- **반응형** — 데스크톱 전체 기능, 태블릿 축소 사이드바, 모바일 뷰어 전용
- **다크 모드** — 시스템 설정 따름, 한국어/영어 UI

## 기술 스택

| 영역 | 선택 |
| --- | --- |
| Frontend | React 18 + TypeScript + Vite 5 |
| Canvas | `@xyflow/react` (React Flow v12) |
| State | Zustand 4 |
| Styling | Tailwind CSS 3 |
| Layout | `@dagrejs/dagre` |
| Export | `html-to-image`, `file-saver` |
| AI | Claude API (`claude-sonnet-4-6`) via Vercel Serverless Function |

## 시작하기

```bash
pnpm install
cp .env.example .env      # CLAUDE_API_KEY 입력 (선택)
pnpm dev                  # http://localhost:5173
```

`CLAUDE_API_KEY`가 없으면 **데모 모드**로 동작합니다 — 서버가 로컬 규칙 기반 생성기로 플로우를 만들어 UI 전체를 키 없이 체험할 수 있습니다.

API 키는 서버(Vite dev 미들웨어 / Vercel Function)에서만 사용되며 브라우저로 전달되지 않습니다.

### 스크립트

| 명령 | 설명 |
| --- | --- |
| `pnpm dev` | 개발 서버 (`/api/generate` 포함) |
| `pnpm build` | 타입체크 + 프로덕션 빌드 |
| `pnpm preview` | 빌드 결과 미리보기 |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc -b` |
| `pnpm format` | Prettier |

## 프로젝트 구조

```
api/
  generate.ts        # Vercel Serverless Function (POST /api/generate)
  _handler.ts        # Claude 호출·검증 (Vite dev와 공유)
  _devPlugin.ts      # Vite 미들웨어로 동일 핸들러 서빙
src/
  components/
    Canvas/          # FlowCanvas, Toolbar, MiniMap, CustomNodes/, CustomEdges/
    Sidebar/         # NodePalette, PropertyPanel
    PromptBar/       # PromptInput, PromptSuggestions
    Header/          # RoleSelector, ExportMenu, ProjectMenu
    Onboarding/      # RoleSelectModal
    common/
  hooks/             # useFlowStore(Zustand), useUndoRedo, useAIGenerate, useExport
  services/
    ai/              # generateFlow, modifyFlow, prompts, mockFlow
    storage.ts       # localStorage
    export.ts        # PNG/SVG/JSON
  utils/             # flowParser, layoutEngine
  constants/         # roles, nodeTypes, samplePrompts
  types/             # flow, role
  i18n/
```

## API

`POST /api/generate`

```jsonc
// request
{ "prompt": "매월 정산 프로세스를 그려줘", "role": "operations", "existingFlow": { /* optional */ } }

// response
{ "flow": { "title": "...", "nodes": [...], "edges": [...] }, "mock": false }
```

## 배포 (Vercel)

1. 저장소를 Vercel에 연결합니다 (프레임워크: Vite).
2. 환경 변수 `CLAUDE_API_KEY`(필수), `CLAUDE_MODEL`(선택, 기본 `claude-sonnet-4-6`)을 설정합니다.
3. `api/generate.ts`가 Serverless Function으로 자동 배포됩니다.

## 라이선스

MIT
