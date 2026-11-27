---
doc: GAP
title: MVP 간극 분석
version: 0.2.0
status: 검토 필요
owner: 김태훈
updated: 2026-11-27
refs: [DEV, DRM, SB, DATA, AGT]
---

# MVP 간극 분석: 설계는 끝났고 구현은 시작되지 않았다

## 1. 문서 개요

파일럿 프로젝트 `ux-ai-studio`의 설계 문서 일곱 종이 2026-11-27에 모두 승인됐습니다. 이 문서는 **그 설계와 실제 코드 사이에 무엇이 비어 있는지**를 저장소 파일을 직접 세어 적습니다.

| 항목 | 내용 |
| --- | --- |
| 상태 | 검토 필요. Claude가 쓴 초안이며 사람의 승인 전입니다. |
| 조사 대상 | `projects/ux-ai-studio/` 전체, `reference/uxui-registry-mock/`, `scripts/`, `.claude/`, `docs/` |
| 조사 방법 | 파일을 읽어 센 값만 적습니다. 추정한 값에는 그렇다고 적습니다. |
| 함께 보는 문서 | [UI 블록 커버리지](UI_BLOCK_COVERAGE.md), [파이프라인 v2](PIPELINE_V2.md), [구현 계획](IMPLEMENTATION_PLAN.md), [MVP 수용 기준](MVP_ACCEPTANCE_CRITERIA.md) |

### 이 문서가 기준이 되는 것과 아닌 것

[개발 아키텍처](10-dev-architecture.md)와 [개발 로드맵](11-dev-roadmap.md)이 이미 있습니다. **그 둘을 대체하지 않습니다.**

| 무엇 | 기준 문서 |
| --- | --- |
| 뷰어 아키텍처, 기술 스택, 코드가 지킬 경계 | [DEV](10-dev-architecture.md) |
| MVP의 정의, M0~M7 마일스톤, 만드는 순서 | [DRM](11-dev-roadmap.md) |
| 에이전트 파이프라인 01~06의 규칙 | [AGT](09-agent-spec.md) |
| **설계와 코드 사이의 간극 측정** | **이 문서** |
| **블록 하나하나의 구현 방법과 우선순위** | [COV](UI_BLOCK_COVERAGE.md) |
| **파이프라인 07~10의 정의** | [PV2](PIPELINE_V2.md) |

## 2. 먼저 바로잡는 것

분석을 시작할 때 쓰인 전제 가운데 넷이 실제와 달랐습니다. 뒤의 계산이 모두 이 수에 걸리므로 먼저 적습니다.

| 전제 | 실제 | 어디서 확인했는가 |
| --- | --- | --- |
| 레지스트리 등록 블록 5종 | **25종**. 5종은 화면이 *쓴* 수 | `reference/uxui-registry-mock/blocks/**/*.json` 25개 |
| 등록 요청 BRQ 26개 | **15건**. 26은 요청을 쓰는 *영역* 수 | `screens/SCR-*.json`의 `block.id` |
| 렌더러가 미지원 블록을 처리하는 방식 | **렌더러가 없습니다** | `.tsx`·`.jsx` 0개, `package.json` 없음 |
| 기존 블록으로 지원 가능한 영역 22개 | **0개**. 코드가 저장소에 없습니다 | 아래 2.2절 |

### 2.1 레지스트리 25종이 안 쓰인 까닭

25종은 전부 **커머스 서비스용 목업**입니다. 쿠폰 다운로드 카드, 배송 추적 타임라인, 결제 수단 선택, 장바구니 플로팅 바, 상품 카드 리스트, 휴대폰 본인인증 같은 것입니다. 설계 대상인 문서 뷰어와 겹치는 것은 **화면 공통 요소뿐**입니다.

화면설계서가 실제로 받아 쓴 것은 다섯입니다.

| 블록 | 이름 | tier | 영역 |
| --- | --- | --- | --- |
| BLK-0001 | 글로벌 헤더 | core | 7 |
| BLK-0012 | 빈 상태 | standard | 6 |
| BLK-0003 | 버튼 그룹 | core | 5 |
| BLK-0020 | 탭 콘텐츠 | standard | 3 |
| BLK-0013 | 무한 스크롤 목록 | standard | 1 |

**22개 영역이 이 다섯을 나눠 씁니다.** 나머지 20종은 쓰임이 맞지 않아 쓰지 않았고, 그 판단 근거는 화면설계서 9절에 블록마다 적혀 있습니다.

### 2.2 쓸 수 있다는 다섯조차 코드가 없습니다

레지스트리의 `code` 필드는 **코드 연결 정보이지 코드가 아닙니다.**

```
BLK-0001  package=@uxui/core    path=packages/core/src/GlobalHeader/GlobalHeader.tsx
BLK-0003  package=@uxui/core    path=packages/core/src/ButtonGroup/ButtonGroup.tsx
BLK-0012  package=@uxui/blocks  path=packages/blocks/src/EmptyState/EmptyState.tsx
BLK-0013  package=@uxui/blocks  path=packages/blocks/src/InfiniteList/InfiniteList.tsx
BLK-0020  connected: false
```

`@uxui/core`와 `@uxui/blocks`는 **이 저장소에 없습니다.** `packages/` 폴더도 없습니다. 레지스트리는 `reference/` 아래의 목업이고 고치지 않기로 한 것입니다(POL-024).

`BLK-0020`은 `connected: false`라 **React prop 이름조차 정해져 있지 않습니다.** 화면설계서가 `tabs`·`activeTabId`·`onTabChange`로 **제안**해 두고 11절에 넘겼습니다.

**결론: 실제 가용 블록은 0개입니다. 영역 48개 전부가 구현 대상입니다.**

## 3. 간극 하나 — UI 블록

영역 48개의 구성입니다.

| 구분 | 영역 | 고유 블록 |
| --- | --- | --- |
| 라이브러리 블록을 가리킴 | 22 | 5종 (코드는 저장소에 없음) |
| 등록 요청을 가리킴 | 26 | 15건 |
| **합계** | **48** | **20** |

여기에 `BRQ-0016`이 하나 더 있습니다. 성격이 달라 위 표에 넣지 않았습니다. 다른 열다섯은 *없는 블록을 만들어 달라*는 요청인데 `BRQ-0016`은 *이미 쓰는 BLK-0001을 넓혀 달라*는 Minor 확장 요청입니다. 영역 일곱이 블록 ID를 `BLK-0001` 그대로 두고 `readAt`·`onRefresh` 두 prop을 더 씁니다.

**요청은 모두 16건입니다.**

구현 방법과 우선순위는 [UI 블록 커버리지](UI_BLOCK_COVERAGE.md)에 블록마다 적었습니다.

### 3.1 이 간극이 뷰어 자신을 때립니다

`SCR-005 화면설계서 뷰어`의 `SCR-005-A03 와이어프레임`은 화면 파일의 영역을 React로 그리는 자리입니다. 그 영역의 예외에 이렇게 적혀 있습니다.

> 영역이 참조한 블록을 그리지 못하면 그 영역 자리에 '블록을 그리지 못했습니다'와 블록 ID를 보이고 나머지 영역은 그대로 그린다

설계로는 옳은 처리입니다. 그런데 **지금 상태로 뷰어를 만들면 자기가 그리는 화면 일곱 장의 모든 영역이 그 메시지로 나옵니다.** 블록 코드가 하나도 없기 때문입니다.

블록을 만들어 갈수록 이 메시지가 줄어듭니다. 그래서 **블록 개발 진도가 곧 뷰어의 완성도**이고, 이것이 [구현 계획](IMPLEMENTATION_PLAN.md)이 블록을 먼저 두는 까닭입니다.

### 3.2 재사용으로 줄일 여지가 있습니다 (제안)

15건의 props 서명을 보면 여덟 계열로 묶입니다.

| 계열 | props 서명 | 요청 | 영역 |
| --- | --- | --- | --- |
| 묶음 참조 목록 | `groups`, `onSelect`, …, `emptyMessage` | BRQ-0008, BRQ-0013, BRQ-0015 | 8 |
| 평면 항목 목록 | `items`, `selectedId`, `onSelect`, `show*`, `emptyMessage` | BRQ-0007, BRQ-0014, BRQ-0001 | 4 |
| 알림 줄 | `tone`, `title`, `description`, `actionLabel`, `onAction` | BRQ-0005, BRQ-0006 | 3 |
| 요약 수치 | `metrics`, `columns` | BRQ-0002 | 3 |
| 요약 카드 | `summary`, `status`, `links`, `emptyMessage` | BRQ-0004 | 2 |
| 내보내기 상태 줄 | `tone`, `status`, `message`, `retryLabel`, `onRetry` | BRQ-0010 | 2 |
| 단계 표시 | `steps`, `currentIndex`, `onSelect`, `expandedId` | BRQ-0003 | 1 |
| 고유 | 각각 다름 | BRQ-0009, BRQ-0011, BRQ-0012 | 3 |

**이 묶음은 구현 단위의 제안이지 블록 ID를 합치자는 것이 아닙니다.** 두 가지를 갈라야 합니다.

- **구현 공유** — 컴포넌트 하나를 여러 BRQ가 쓰도록 합니다. BRQ 번호는 그대로 둡니다.
- **요청 병합** — BRQ 번호 자체를 합칩니다. 화면 파일의 `block.id`를 고쳐야 하고 설계 문서의 근거 표도 함께 고쳐야 합니다.

**알림 줄 계열은 어느 쪽도 하지 않습니다.** 2026-11-26에 사람이 "BRQ-0005와 BRQ-0006을 묶지 않는다"고 확정했습니다. 화면설계서 변경 이력 0.2.0에 남아 있습니다.

## 4. 간극 둘 — 구현 단계

"구현 파이프라인이 없다"는 말은 **반만 맞습니다.** 층이 둘이기 때문입니다.

| 층 | 무엇 | 지금 |
| --- | --- | --- |
| 사람이 만드는 계획 | [DRM](11-dev-roadmap.md)의 M0~M7. M3~M6이 WU-001~004의 뷰어 구현 | **있습니다** |
| 에이전트가 도는 단계 | `scripts/lib/project.py`의 `STAGES`, `.claude/agents/` | **01~06뿐입니다** |

즉 **설계서를 코드로 옮기는 일을 에이전트에게 맡기는 길이 없습니다.** 사람이 DRM을 보고 손으로 만드는 길만 있습니다.

```python
STAGES = {
    "requirements": ("01 Requirements", ["REQ"]),
    "policy":       ("02 Policy",       ["POL"]),
    "flow":         ("03 Flow",         ["UF", "WF"]),
    "ia":           ("04 IA",           ["IA"]),
    "screen":       ("05 Screen",       ["SB"]),
    "qa":           ("06 QA",           ["QA"]),
}
```

`.claude/agents/`에도 `requirements`·`policy`·`flow`·`ia`·`screen`·`qa` 여섯뿐입니다. `check_gate.py`의 시작·완료 조건도 여섯 단계분만 있습니다.

07~10 단계의 정의는 [파이프라인 v2](PIPELINE_V2.md)에 적었습니다.

## 5. 간극 셋 — 문서와 실제가 어긋난 곳

계획 문서가 가리키는데 저장소에 없거나, 수가 달라진 곳입니다. **고치지 않고 적어만 둡니다.** 어느 쪽을 고칠지는 사람이 정할 일입니다.

| 어디 | 적힌 것 | 실제 |
| --- | --- | --- |
| [DRM](11-dev-roadmap.md) 3절 | M1 완료 기준이 아직 — "전문 에이전트를 실제로 불러 PR 두 개를 여는 것이 남았습니다" | 파이프라인 01~06을 완주하고 PR #4~#14가 병합됐습니다 |
| [DRM](11-dev-roadmap.md) M0 | `schemas/*.schema.json` 9개, `scripts/check_project.py` | 둘 다 없습니다 |
| [DRM](11-dev-roadmap.md) M3 | WU-001의 등록 요청 블록 4개(BRQ-0001~0004) | **6개**(BRQ-0001~0006). 사람이 알림 줄을 둘로 가른 뒤 늘었습니다 |
| [DEV](10-dev-architecture.md) 8절 | "WU-001 하나에서 등록 요청이 4건 나왔습니다" | 같은 까닭으로 6건입니다 |
| [DEV](10-dev-architecture.md) 3절 | `viewer/` 폴더 구조 | `viewer/`가 없습니다 |

DRM과 DEV는 2026-11-26에 쓰였고 화면설계서는 그 뒤에 0.2.0 → 0.6.2로 여섯 번 바뀌었습니다. **계획 문서가 설계 문서를 따라오지 못한 것**이며, 이것 자체가 4절의 간극을 보여 줍니다. 설계가 바뀌면 영향받는 문서를 찾아 주는 일이 아직 사람 몫입니다.

## 6. 세어 둔 값

뒤의 문서들이 이 수를 씁니다.

| 값 | 수 | 출처 |
| --- | --- | --- |
| 화면 | 7 | `ia.json`의 `SCR` 항목 |
| 작업 단위 | 4 | `ia.json`의 `work_units` |
| 화면 영역 | 48 | `screens/SCR-*.json`의 `areas` |
| 화면 간 이동 | 21 | `ia.json`의 `transitions` |
| 유저 플로우 단계 | 42 | `user-flow.json` |
| 워크 플로우 처리 | 42 | `workflow.json` |
| 화면 state 키 | 61 | `screens/SCR-*.json`의 `state` |
| 요구사항 | 21 | `requirements.json` |
| 정책 | 21 | `policies.json` |
| 정책×영역 예외 짝 | 193 | 영역의 `exceptions`와 정책의 `exceptions` 대조 |
| 레지스트리 블록 | 25 | `reference/uxui-registry-mock/blocks/` |
| 화면이 쓰는 라이브러리 블록 | 5 | 위 2.1절 |
| 등록 요청 | 16 | BRQ-0001~0015 + BRQ-0016 |
| 저장소의 React 컴포넌트 | **0** | `.tsx`·`.jsx` 검색 |

## 7. 미정 사항

### 2026-11-27에 정해진 것

[결정 기록](decisions.md)으로 옮겼습니다. 더 묻지 않습니다.

| 사항 | 정해진 것 |
| --- | --- |
| 뷰어 코드의 자리 | **같은 저장소의 `viewer/`**. DEV 3절의 제안대로입니다 |
| `BLK-0020`의 prop 이름 | **`tabs`, `activeTabId`, `onTabChange`** |
| 블록 구현의 공유 | **컴포넌트는 공유하되 BRQ 번호는 유지**합니다. BRQ-0005·0006은 구현도 공유하지 않습니다 |
| 코드의 자물쇠 | **`viewer/`에 문서 코드 `UI`를 줍니다**([PV2](PIPELINE_V2.md) 2절의 가) |

### 아직 남은 것

| 사항 | 정해야 하는 것 |
| --- | --- |
| DRM·DEV의 낡은 수를 고칠 것인가 | 5절의 다섯 줄 |
| 07~10 단계를 에이전트에게 맡길 것인가 | [PV2](PIPELINE_V2.md)의 전제입니다. 사람이 손으로 만드는 길만 둘 수도 있습니다 |
| 블록을 만드는 순서 | [IMP](IMPLEMENTATION_PLAN.md) 4절의 길 ① vs ② |

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
| --- | --- | --- |
| 0.1.0 | 2026-11-27 | 최초 작성. 전제 넷을 바로잡고 간극 셋(UI 블록·구현 단계·문서와 실제)을 적음 |
| 0.2.0 | 2026-11-27 | 선행 결정 넷이 확정되어 7절을 '정해진 것'과 '남은 것'으로 가름 |
