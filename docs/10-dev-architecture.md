---
doc: DEV
title: 개발 아키텍처
version: 0.1.0
status: 검토 필요
owner: 김태훈
updated: 2026-11-26
refs: [FSD, IA, SB, DATA, AGT]
---

# 개발 아키텍처: AI UX 설계 자동화 시스템

## 1. 문서 개요

이 문서는 확정된 기획을 **코드로 옮기는 방법**을 정합니다. 기술 스택, 저장소의 코드 폴더 구조, 뷰어의 컴포넌트 구조, 에이전트 계층의 파일 배치, 검증 스크립트의 구성입니다.

| 항목 | 내용 |
| --- | --- |
| 상태 | 검토 필요. Claude가 쓴 초안이며 사람의 승인 전입니다. |
| 기준 문서 | [기능 정의서](03-functional-spec.md) 7절, [데이터 규격](08-data-spec.md), [에이전트 명세](09-agent-spec.md), [정보 구조도](06-information-architecture.md), [화면설계서](07-screen-spec.md) |
| 확정 전 입력 | 이 문서의 기술 선택은 모두 **제안**입니다. 4절의 확정 열을 보십시오. |
| 짝이 되는 문서 | [개발 로드맵](11-dev-roadmap.md)이 이 구조를 만드는 순서를 정합니다. |

### 이 문서가 정하지 않는 것

무엇을 만들지는 기존 문서가 이미 정했습니다. 이 문서는 그것을 되풀이하지 않습니다.

| 이미 정해진 것 | 어느 문서 |
| --- | --- |
| 시스템이 하는 일과 기능 32개 | [기능 정의서](03-functional-spec.md) 3절 |
| 실행 구조 (세션, GitHub, 뷰어) | [기능 정의서](03-functional-spec.md) 7절 |
| 프로젝트 데이터의 폴더와 JSON 스키마 | [데이터 규격](08-data-spec.md) |
| 에이전트 7개의 역할과 시작·완료 조건 | [에이전트 명세](09-agent-spec.md) |
| 뷰어 화면 7개와 작업 단위 4개 | [정보 구조도](06-information-architecture.md) |
| STU-01·STU-02의 영역, 인터랙션, 예외 | [화면설계서](07-screen-spec.md) |

## 2. 전체 구조

실행 위치 세 곳(세션, GitHub, 뷰어)은 기능 정의서 7절이 확정했습니다. 코드 관점에서는 **저장소 하나에 네 계층**이 들어갑니다.

```
GitHub 저장소 하나
│
├─ ① 에이전트 계층    CLAUDE.md, .claude/agents/, .claude/settings.json
│                     claude.ai/code 클라우드 세션이 읽어 실행한다. 빌드하지 않는다.
│
├─ ② 검증 계층        scripts/*.py, schemas/*.schema.json
│                     세션과 PR이 돌린다. 의존성을 최소로 둔다.
│
├─ ③ 데이터 계층      projects/<project-id>/**
│                     에이전트가 쓰고, 사람이 PR에서 고치고, 뷰어가 읽는다.
│
└─ ④ 뷰어 계층        viewer/
                      ③을 읽어 그리는 읽기 전용 React 앱. ③에 쓰지 않는다.
```

계층 사이의 방향은 한쪽입니다. **④는 ③을 읽기만 하고, ③에 쓰는 것은 ①뿐이며, ②는 ③을 검사만 합니다.** 이 방향을 코드 구조로 강제하는 방법이 5.2절입니다.

| 계층 | 빌드가 필요한가 | 실행하는 곳 | 바꾸는 사람 |
| --- | --- | --- | --- |
| ① 에이전트 | 아니오 (Markdown·JSON) | 클라우드 세션 | 사람 |
| ② 검증 | 아니오 (Python) | 세션, PR | 사람 |
| ③ 데이터 | 아니오 | — | 에이전트, 사람 |
| ④ 뷰어 | 예 (Vite 빌드) | 브라우저 | 사람 |

빌드가 필요한 것이 ④뿐이라는 점이 중요합니다. 에이전트가 도는 데는 빌드도 서버도 필요 없고, 파이프라인은 뷰어 없이 먼저 완주시킬 수 있습니다. [개발 로드맵](11-dev-roadmap.md)의 순서가 여기서 나옵니다.

## 3. 저장소 폴더 구조 (제안)

데이터 규격 2절이 정한 경로를 그대로 두고 코드 자리를 더했습니다. 굵게 적은 것이 새로 만드는 것입니다.

```
/
├── CLAUDE.md                      ① 총괄 에이전트 규칙 (AGT 2절을 옮긴 것)
├── CONTRIBUTING.md                (있음) 문서 형상관리 규칙
├── CHANGELOG.md                   (있음)
├── ReadME.md                      (있음)
│
├── .claude/
│   ├── agents/                    ① 전문 에이전트 명세 6개 (AGT 3~8절)
│   │   ├── requirements.md
│   │   ├── policy.md
│   │   ├── flow.md
│   │   ├── ia.md
│   │   ├── screen.md
│   │   └── qa.md
│   └── settings.json              ① 권한 규칙과 훅 (AGT 9절)
│
├── docs/                          (있음) 이 시스템 자체의 기획 문서
├── reference/                     (있음) 고치지 않는다
│
├── schemas/                       ② 프로젝트 데이터의 JSON Schema
│   ├── project.schema.json
│   ├── requirements.schema.json
│   ├── policies.schema.json
│   ├── user-flow.schema.json
│   ├── workflow.schema.json
│   ├── ia.schema.json
│   ├── screen.schema.json
│   ├── validation.schema.json
│   └── meta.schema.json           status, runs, changes
│
├── templates/
│   └── PROJECT.md                 사람이 쓰는 프로젝트 정의서 양식
│
├── scripts/
│   ├── check_docs.py              (있음) 이 저장소의 기획 문서 검사
│   ├── check_project.py           ② 프로젝트 데이터 검사 (DATA 7절)
│   ├── check_gate.py              ② 에이전트 시작·완료 조건 검사 (FSD 7절)
│   ├── impact.py                  ② 변경 영향 분석 (FSD 8절)
│   └── lib/                       ② 세 스크립트가 함께 쓰는 읽기·참조 해석
│
├── projects/                      ③ 프로젝트 데이터 (DATA 2절)
│   └── <project-id>/
│       ├── PROJECT.md  project.json
│       ├── PRD.md      requirements.json
│       ├── POLICY.md   policies.json
│       ├── USER-FLOW.md  user-flow.json
│       ├── WORKFLOW.md   workflow.json
│       ├── IA.md         ia.json
│       ├── STORYBOARD.md  screens/SCR-000.json ...
│       ├── QA-REPORT.md   validation.json
│       └── _meta/      status.json, runs.json, changes.json
│
├── viewer/                        ④ UX AI Studio (5절)
│
└── .github/workflows/
    ├── check.yml                  ② PR에서 검사 스크립트 실행
    └── deploy-viewer.yml          ④ 뷰어 빌드와 배포
```

`project-id`는 소문자, 숫자, 붙임표만 씁니다(DATA 3절). 파일럿의 `project-id`는 `ux-ai-studio`를 제안합니다.

## 4. 기술 스택 (제안)

확정 열이 "확정"인 것만 결정 기록에 있는 내용입니다. 나머지는 모두 제안이며, 사용자가 고르면 [결정 기록](decisions.md)으로 옮깁니다.

| 영역 | 제안 | 근거 | 함께 검토한 후보 | 확정 |
| --- | --- | --- | --- | --- |
| 뷰어 UI | React + TypeScript | React는 결정 기록 2026-11-25에 확정. TypeScript는 JSON 스키마를 타입으로 받아 화면설계서 렌더러의 실수를 빌드 때 잡기 위함 | JavaScript만 쓰기 | React만 확정 |
| 빌드 도구 | Vite | 뷰어는 서버가 필요 없는 읽기 전용 정적 앱이다(POL-034). 서버 렌더링과 API 라우트가 필요 없으므로 정적 빌드로 충분하다 | Next.js, Remix | 제안 |
| 라우팅 | React Router | 화면 7개의 SPA. 정적 호스팅에서 동작한다 | 파일 기반 라우팅 | 제안 |
| 상태 관리 | 전역 스토어 없음. 화면 단위 React State | 인터랙션을 React State로 구현하기로 확정했고(결정 기록), 뷰어는 서버 상태를 갖지 않는다. 전역 스토어를 두면 쓰기 경로가 생긴다 | Zustand, Redux, TanStack Query | 제안 |
| 스타일 | CSS Modules + CSS 변수 토큰 | 블록 레지스트리의 `spec.tokens`를 CSS 변수로 그대로 받는다. 블록마다 파일이 분리되어 블록 경계가 코드에서도 유지된다 | Tailwind, styled-components | 제안 |
| 플로우 다이어그램 | React Flow | 분기에 정책을 달고 연결되지 않은 분기를 강조해야 한다(STU-05). 노드를 React 컴포넌트로 그릴 수 있어야 한다 | Mermaid(커스텀 표시가 어려움), 직접 SVG(레이아웃을 직접 계산해야 함) | 제안 |
| PNG 내보내기 | html-to-image | 다이어그램 DOM을 그대로 PNG로 받는다. 브라우저에서 끝난다 | 서버 렌더링(서버가 생김) | 제안 |
| PPTX 내보내기 | pptxgenjs | 브라우저에서 동작하는 PPTX 생성기. 서버가 필요 없다 | 서버에서 생성, 수동 내보내기 | 제안 |
| 테스트 | Vitest + Testing Library | Vite와 같은 설정을 쓴다. 렌더러와 블록 컴포넌트의 단위 시험이 주 대상이다 | Jest, 시험 없음 | 제안 |
| 패키지 매니저 | npm | 클라우드 세션에 기본으로 있다. 추가 설치 단계를 만들지 않는다 | pnpm, yarn | 제안 |
| 검증 스크립트 | Python 3 (표준 라이브러리 중심) | `check_docs.py`가 이미 Python이고 의존성이 없다. 클라우드 세션에서 설치 없이 돈다 | Node.js로 통일 | 제안 |
| JSON Schema 검증 | `jsonschema` 패키지 하나 | 스키마 검증을 직접 구현하지 않는다. `requirements.txt`에 이 하나만 둔다 | 직접 구현(의존성 0), ajv(Node) | 제안 |
| 뷰어 배포 | GitHub Pages + GitHub Actions | GitHub 사용이 확정(POL-031)이고 추가 과금이 없다. 저장소 커밋이 그대로 배포 입력이 된다 | Vercel, 사내 정적 호스팅, 배포하지 않고 로컬 실행 | 제안. IA 7절의 미정 사항 |

### 확인이 필요한 제약

- **비공개 저장소의 GitHub Pages**는 GitHub Pro·Team·Enterprise 플랜에서만 됩니다. 조직 플랜을 확인해야 합니다. 안 되면 사내 정적 호스팅이나 로컬 실행으로 내립니다.
- **고객사 문서가 GitHub과 Anthropic 클라우드에 놓입니다**(FSD 7절의 제약). 배포처를 고를 때 같이 봐야 합니다.

## 5. 뷰어 아키텍처

### 5.1 폴더 구조 (제안)

```
viewer/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── main.tsx
    ├── app/
    │   ├── routes.tsx             STU-01 … STU-08의 경로
    │   └── Layout.tsx             글로벌 헤더가 들어가는 틀
    ├── screens/                   화면 하나 = 파일 하나. 조립만 한다
    │   ├── ProjectList.tsx            STU-01
    │   ├── ProjectDashboard.tsx       STU-02
    │   ├── DocumentView.tsx           STU-04
    │   ├── FlowPreview.tsx            STU-05
    │   ├── ChangeImpact.tsx           STU-06
    │   ├── StoryboardViewer.tsx       STU-07
    │   └── ValidationResult.tsx       STU-08
    ├── blocks/                    블록 레지스트리의 블록과 1:1
    │   ├── index.ts                   blockId → 컴포넌트 매핑표
    │   ├── BLK-0001.GlobalHeader.tsx
    │   ├── BLK-0003.ButtonGroup.tsx
    │   ├── BLK-0012.EmptyState.tsx
    │   ├── BLK-0013.InfiniteList.tsx
    │   └── requested/                 등록 요청 중인 블록 (BRQ-0001~0004)
    ├── components/                블록이 아닌 뷰어 전용 요소
    │   ├── StatusBadge.tsx
    │   ├── RefPanel.tsx
    │   └── ExternalLink.tsx           세션·GitHub으로 보내는 링크
    ├── renderer/                  화면설계서 JSON → React (5.3절)
    │   ├── ScreenRenderer.tsx
    │   ├── useScreenState.ts
    │   └── ExceptionPanel.tsx
    ├── flow/                      플로우 다이어그램과 PNG
    ├── export/                    PPTX, PNG 내보내기
    ├── data/                      저장소 파일 수집과 타입 (5.2절)
    │   ├── load.ts
    │   └── types.ts                   schemas/에서 생성한 타입
    └── tokens/
        └── tokens.css                 디자인 토큰 CSS 변수
```

### 5.2 데이터 계층: 읽기 전용을 구조로 강제한다

뷰어는 저장소의 파일을 읽기만 합니다(POL-034). 이것을 규칙으로 적어 두는 데 그치지 않고 코드 구조로 막습니다.

**1차 구현은 빌드 시점 수집입니다.** 뷰어를 같은 저장소 안에 두고, 빌드할 때 Vite가 `projects/` 아래의 Markdown과 JSON을 읽어 번들에 넣습니다. 런타임에 저장소를 조회하지 않습니다.

| 항목 | 내용 |
| --- | --- |
| 수집 시점 | `npm run build` 때 `import.meta.glob`으로 `../projects/**/*.{md,json}`을 읽습니다. |
| 갱신 방법 | 커밋이 올라가면 GitHub Actions가 다시 빌드해 Pages에 올립니다. |
| 인증 | 필요 없습니다. 빌드가 저장소 안에서 일어납니다. |
| 서버 | 없습니다. |

이 방식의 이점은 **쓰기 경로가 애초에 없다**는 것입니다. 네트워크 호출도 토큰도 없으므로 뷰어가 저장소를 고치는 코드를 실수로라도 넣을 수 없습니다.

한계는 두 가지입니다.

- **반영이 재빌드 뒤입니다.** 커밋 직후 몇 분 사이에는 옛 내용이 보입니다. 파일럿에서 이 지연이 쓸 만한지 측정합니다.
- **열려 있는 PR 목록(STU-02-A05)은 빌드 시점에 알 수 없습니다.** 이것만 런타임 조회가 필요합니다. 1차에서는 이 영역을 "GitHub에서 보기" 링크로 대신하고, 필요하면 2차에서 GitHub API 조회를 붙입니다.

바꿀 수 있게 **모든 파일 접근을 `data/load.ts` 하나로 가둡니다.** 화면과 렌더러는 이 모듈의 함수만 부르고 파일 경로를 직접 알지 못합니다. 나중에 런타임 조회로 바꿔도 고칠 파일이 하나입니다.

타입은 손으로 쓰지 않고 `schemas/`의 JSON Schema에서 생성합니다. 스키마가 바뀌면 타입이 바뀌고 빌드가 깨져, 데이터 규격과 뷰어가 어긋난 채로 배포되지 않습니다.

### 5.3 컴포넌트 3계층

재사용의 단위를 세 가지로 나눕니다. 어느 계층에 두는지를 섞지 않는 것이 이 구조의 전부입니다.

| 계층 | 무엇인가 | 규칙 |
| --- | --- | --- |
| `blocks/` | 블록 레지스트리의 블록 하나에 대응하는 컴포넌트 | 파일 맨 위에 블록 ID와 버전 범위를 적습니다. props 이름은 레지스트리의 코드 연결 정보를 그대로 씁니다(POL-026). 블록 밖의 데이터를 직접 읽지 않고 props로만 받습니다. |
| `components/` | 블록이 아닌 뷰어 전용 요소 | 여러 화면이 쓰면 블록 등록을 요청하고, 승인되면 `blocks/`로 옮깁니다. |
| `screens/` | STU 화면 하나 | 블록을 조립하고 `data/`에서 받은 값을 props로 내려 줍니다. 화면에 업무 규칙을 두지 않습니다. |

**핵심은 `blocks/`를 뷰어 화면과 와이어프레임 렌더러가 함께 쓴다는 것입니다.** 뷰어가 STU-01을 그릴 때 쓰는 글로벌 헤더 컴포넌트와, 화면설계서 뷰어(STU-07)가 `screens/SCR-000.json`을 렌더링할 때 쓰는 글로벌 헤더 컴포넌트가 같은 파일입니다.

이 구조가 파일럿을 자기 검증으로 만듭니다. 파일럿 대상이 이 시스템 자신이므로(결정 기록 2026-11-25), [화면설계서](07-screen-spec.md)의 WU-001이 뷰어 STU-01·STU-02의 구현 명세이면서 동시에 렌더러의 첫 시험 데이터입니다. 렌더러가 `STU-01.json`을 그린 결과와 손으로 만든 `ProjectList.tsx`가 같아야 합니다. 다르면 둘 중 하나가 틀린 것입니다.

등록 요청 중인 블록(`BRQ-0000`)은 `blocks/requested/`에 두고, 렌더링할 때 "등록 요청 중" 배지를 붙입니다. QA-07이 이 영역을 보고서에 따로 표시하는 것과 짝입니다.

### 5.4 화면설계서 렌더러

`screens/SCR-000.json`을 React로 그립니다. FSD 5절의 렌더링 규칙을 그대로 구현합니다.

| JSON | 렌더러의 처리 |
| --- | --- |
| `areas[]` | 배열 순서대로 블록 컴포넌트를 그립니다. |
| `block.id` | `blocks/index.ts`의 매핑표에서 컴포넌트를 찾습니다. 없으면 자리 표시 컴포넌트와 경고를 그립니다. |
| `block.version` | 매핑표의 Major와 맞는지 보고, 어긋나면 경고를 그립니다(POL-018). |
| `props` | 컴포넌트에 그대로 넘깁니다. 키는 React prop 이름입니다(POL-026). |
| `state` | `useScreenState`의 초기값. 화면 하나가 상태 하나를 갖습니다. |
| `interactions[]` | `trigger`를 이벤트 핸들러로 달고, 일어나면 `set`에 적힌 키를 바꿉니다. `set`이 `state`에 없으면 빌드가 아니라 렌더링 때 잡아 경고합니다. |
| `exceptions[]` | 오른쪽 패널에 목록으로 보입니다. 화면 안에 조건부로 끼워 넣지 않습니다. |

렌더러는 **그리기만 하고 판정하지 않습니다.** 블록이 없거나 버전이 어긋나는 것은 경고로 보이되, 통과·실패 판정은 QA Agent와 검증 스크립트가 합니다. 같은 판정을 두 곳에서 하면 결과가 갈립니다.

## 6. 에이전트 계층

[에이전트 명세](09-agent-spec.md)가 정한 내용을 저장소 파일로 옮기는 방법입니다. 명세 1절의 대응표가 기준이고, 여기서는 파일의 모양을 정합니다.

| 파일 | 담는 것 | 옮겨 오는 곳 |
| --- | --- | --- |
| `CLAUDE.md` | 실행 순서, 한 단계의 처리 7단계, 시작 조건, 상황별 처리, 하지 않는 것 | AGT 2절 |
| `.claude/agents/<name>.md` | 에이전트 하나의 읽는 것, 만드는 것, 시작·완료 조건, 지켜야 할 것 | AGT 3~8절 |
| `.claude/settings.json` | 쓰기 경로 제한과 훅 | AGT 9절 |

전문 에이전트 명세 파일은 머리말에 `name`, `description`, `tools`, `model`을 두고 본문에 명세 절을 그대로 옮깁니다. `description`은 총괄 에이전트가 어느 에이전트를 부를지 고르는 근거이므로, 명세의 "읽는 것·만드는 것"을 한 문장으로 적습니다.

### 시작·완료 조건을 스크립트로 두는 이유

FSD 7절의 마지막 제약은 "순서 제어를 모델이 맡는다"입니다. 모델이 판정하면 결과가 매번 같지 않으므로, **판정은 `scripts/check_gate.py`가 하고 모델은 그 결과를 읽습니다.**

```
check_gate.py <project-id> --stage 05-screen --phase start
  → 0: 시작할 수 있다
  → 1: 조건을 못 채웠다. 무엇이 막혔는지 목록으로 출력한다
```

총괄 에이전트는 AGT 2절의 1번(시작 조건 확인)과 4번(완료 조건 검사)에서 이 스크립트를 부릅니다. 같은 스크립트를 `.github/workflows/check.yml`이 PR에서도 돌려, 규칙을 벗어난 결과가 병합되지 않게 합니다.

### 훅

훅은 막는 데만 씁니다(AGT 9절). 쓰기 전 훅 하나로 세 가지를 봅니다.

| 막는 것 | 훅이 보는 것 |
| --- | --- |
| 사람이 고친 항목 덮어쓰기 | 대상 항목의 `origin`이 `human`인가 (POL-010) |
| 상태를 승인으로 바꾸기 | `status.json`의 `state`가 `승인`으로 바뀌는가 (POL-002) |
| 표준 블록 폴더에 쓰기 | 경로가 블록 레지스트리의 표준 블록인가 (POL-024) |

쓰기 경로 제한은 훅이 아니라 `settings.json`의 권한 규칙으로 둡니다. 에이전트마다 쓸 수 있는 경로를 적고, 예외는 IA Agent가 `user-flow.json`의 `screen` 필드를 채우는 하나입니다(AGT 6절).

## 7. 검증 계층

스크립트 넷이 서로 다른 것을 봅니다. 하나로 합치지 않는 이유는 부르는 자리가 다르기 때문입니다.

| 스크립트 | 대상 | 부르는 자리 |
| --- | --- | --- |
| `check_docs.py` (있음) | `docs/`의 기획 문서 | 사람이 커밋 전에, PR에서 |
| `check_project.py` | `projects/<id>/`의 데이터 | 생성 직후, PR에서 |
| `check_gate.py` | 시작·완료 조건 | 총괄 에이전트가 단계마다 |
| `impact.py` | 바뀐 항목의 영향 범위 | 병합 뒤, 사람이 요청할 때 |

넷이 함께 쓰는 것은 `scripts/lib/`에 둡니다. 파일 읽기, 머리말 해석, `refs` 그래프 만들기입니다. `check_docs.py`는 이미 돌고 있으므로 `lib/`로 옮길 때 동작이 바뀌지 않는지 먼저 확인합니다.

`impact.py`는 FSD 8절의 판정표를 그대로 구현합니다. `refs`를 따라 내려가며 수정 필요를, 올라가며 검토 필요를 표시하고, 한 단계에서 멈추지 않고 되풀이합니다.

## 8. 블록 레지스트리 연결

블록 레지스트리는 아직 프로토타입이고 `reference/` 아래의 목업입니다. 연결 방법은 두 단계로 나눕니다.

| 단계 | 방법 | 쓰는 곳 |
| --- | --- | --- |
| 1차 (MVP) | 뷰어가 쓰는 블록만 `viewer/src/blocks/`에 직접 만들고, 블록 ID와 버전을 파일에 적습니다. | M3~M5 |
| 2차 | 레지스트리를 저장소로 옮기고, 세션이 커넥터로 읽어 블록을 고릅니다(FN-501). | 개발 단계 |

1차에서 레지스트리를 기다리지 않는 이유는 [화면설계서](07-screen-spec.md) 3절이 드러낸 것 때문입니다. 목업 25개는 커머스용이고 뷰어와 겹치는 것이 공통 요소뿐이라, WU-001 하나에서 등록 요청이 4건 나왔습니다. 레지스트리가 채워지기를 기다리면 파일럿이 시작되지 않습니다.

대신 `viewer/src/blocks/`를 레지스트리로 옮길 수 있는 모양으로 둡니다. 파일 하나가 블록 하나이고, 블록 ID와 버전과 props 이름을 파일에 적어 두면 나중에 레지스트리의 코드 연결 정보로 그대로 올라갑니다. 레지스트리의 [AGENTS.md](../reference/uxui-registry-mock/AGENTS.md)를 `CLAUDE.md`에 어떻게 연결할지는 AGT 10절의 미정 사항입니다.

## 9. 코드가 지켜야 할 경계

문서의 정책을 코드에서 깨뜨리기 쉬운 자리를 모았습니다. 리뷰에서 이것부터 봅니다.

| 경계 | 깨지는 모습 | 근거 |
| --- | --- | --- |
| 뷰어는 저장소에 쓰지 않는다 | 뷰어에 POST 호출이나 쓰기 토큰이 생긴다 | POL-034 |
| 뷰어는 승인하지 않는다 | 뷰어에 승인 버튼이 생긴다. 승인은 PR 병합뿐이다 | POL-002 |
| 뷰어는 에이전트를 실행하지 않는다 | 뷰어에 실행 버튼이 생긴다. 1차에서는 세션 링크만 둔다 | FSD 7절 |
| 판정은 한 곳에서만 한다 | 렌더러와 QA Agent가 같은 것을 다르게 판정한다 | 5.4절 |
| 항목 ID는 바뀌지 않는다 | 코드가 ID를 다시 매기거나 재사용한다 | POL-014 |
| 파일 접근은 `data/load.ts`를 거친다 | 화면이 파일 경로를 직접 안다 | 5.2절 |

## 10. 미정 사항

- [ ] 4절의 기술 선택 전부. React만 확정이고 나머지는 제안입니다.
- [ ] 뷰어 배포처와 비공개 저장소의 GitHub Pages 가능 여부 (IA 7절)
- [ ] 빌드 시점 수집의 갱신 지연이 쓸 만한지. 파일럿에서 측정합니다 (5.2절)
- [ ] 열려 있는 PR 목록(STU-02-A05)을 1차에서 링크로 대신할지, GitHub API를 붙일지
- [ ] `check_docs.py`를 `scripts/lib/`로 옮길지, 지금처럼 홀로 둘지 (7절)
- [ ] 코드 연결이 없는 블록의 와이어프레임용 컴포넌트를 누가 만드는지 (DATA 8절과 같은 항목)
- [ ] 화면 영역 ID에 `STU`를 쓰는 것(`STU-01-A01`)과 데이터 규격의 `SCR-000-A00`의 관계 (SB 4절)

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
| --- | --- | --- |
| 0.1.0 | 2026-11-26 | 최초 작성. 네 계층 구조, 저장소 폴더, 기술 스택 제안, 뷰어 아키텍처, 에이전트·검증 계층, 코드 경계 |
