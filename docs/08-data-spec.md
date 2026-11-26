---
doc: DATA
title: 데이터 규격
version: 0.3.0
status: 검토 필요
owner: 김태훈
updated: 2026-11-26
refs: [POL, FSD]
---

# 데이터 규격: AI UX 설계 자동화 시스템

## 1. 문서 개요

이 문서는 프로젝트 데이터 저장소의 폴더 구조와 JSON 스키마를 정합니다. [기능 정의서](03-functional-spec.md) 5절의 데이터 정의를 스키마 파일 수준으로 구체화한 것이며, 에이전트가 무엇을 읽고 무엇을 써야 하는지의 기준이 됩니다.

| 항목 | 내용 |
| --- | --- |
| 상태 | 검토 필요. Claude가 쓴 초안이며 사람의 승인 전입니다. |
| 기준 문서 | 기능 정의서 0.4.1 5절, [정책서](02-policy.md) 4절 (POL-013~017, POL-033) |
| 확정된 입력 | 웹 구동 방식, 요청 ID 접두어(BRQ-0000), props 키(코드 prop 이름) |
| 범위 밖 | ERD. [결정 기록](decisions.md) 2026-11-24에 따라 추후 고도화로 남깁니다. |

이 문서에서 새로 정한 것은 8절에 제안으로 모았습니다. 확정 전에 검토가 필요합니다.

## 2. 폴더 구조

프로젝트 하나가 폴더 하나입니다. Markdown과 JSON이 짝을 이루고, 이 파일이 원본입니다(POL-013).

```
projects/<project-id>/
├── PROJECT.md          project.json
├── PRD.md              requirements.json
├── POLICY.md           policies.json
├── USER-FLOW.md        user-flow.json
├── WORKFLOW.md         workflow.json
├── IA.md               ia.json
├── STORYBOARD.md       screens/SCR-001.json, SCR-002.json, ...
├── QA-REPORT.md        validation.json
└── _meta/              status.json, runs.json, changes.json
```

저장소 전체에는 다음을 둡니다. 프로젝트 폴더 바깥이며 모든 프로젝트가 함께 씁니다.

| 경로 | 내용 |
| --- | --- |
| `schemas/*.schema.json` | 이 문서가 정한 JSON Schema 파일 |
| `templates/PROJECT.md` | 사람이 쓰는 프로젝트 정의서 양식 |
| `scripts/` | 검증 스크립트 (7절) |
| `.claude/agents/` | 전문 에이전트 명세 6개 ([에이전트 명세](09-agent-spec.md)) |
| `CLAUDE.md` | 총괄 규칙 |

`project-id`는 소문자, 숫자, 붙임표만 쓰고 한 번 정하면 바꾸지 않습니다. (제안)

## 3. 공통 필드와 ID 규칙

### 공통 필드

ID가 붙는 모든 항목은 아래 여섯 필드를 갖습니다(POL-015).

| 필드 | 형 | 필수 | 내용 |
| --- | --- | --- | --- |
| `id` | string | 예 | 접두어와 번호. 한 번 붙이면 바꾸거나 재사용하지 않습니다. |
| `title` | string | 예 | 사람이 읽는 이름 |
| `description` | string | 예 | 설명 |
| `refs` | string[] | 예 | 이 항목이 참조하는 상위 항목의 ID 목록. 영향 분석이 이 필드를 따라갑니다(POL-016). 없으면 빈 배열입니다. |
| `origin` | `"ai"` \| `"human"` | 예 | 사람이 고친 항목은 `human`이 되고 재생성 대상에서 빠집니다(POL-010). |
| `updated_at` | string (`YYYY-MM-DD`) | 예 | 마지막으로 내용을 바꾼 날 |

항목이 폐기되면 지우지 않고 `deprecated`를 `true`로 둡니다. 폐기된 항목의 ID는 다시 쓰지 않습니다. (제안)

### 파일 공통 머리 필드

모든 JSON 파일은 항목 배열 앞에 아래 세 필드를 둡니다. (제안)

| 필드 | 형 | 내용 |
| --- | --- | --- |
| `doc` | string | 문서 코드 (`REQ`, `POL`, `UF`, `WF`, `IA`, `SCR`, `QA`) |
| `version` | string | 짝이 되는 Markdown 머리말의 `version`과 같아야 합니다. |
| `items` | object[] | 항목 배열 |

### ID 규칙

POL-014의 형식입니다. 번호는 1부터 차례로 붙이고 비는 번호를 두지 않습니다.

| 접두어 | 대상 | 형식 | 만드는 단계 |
| --- | --- | --- | --- |
| `REQ` | 요구사항 | `REQ-000` | 01 Requirements |
| `POL` | 정책 | `POL-000` | 02 Policy |
| `UF` | 유저 플로우 단계 | `UF-000` | 03-A Flow |
| `WF` | 워크 플로우 처리 | `WF-000` | 03-B Flow |
| `SCR` | 화면 | `SCR-000` | 04 IA |
| `SCR-000-A00` | 화면 영역 | 화면 ID + `-A` + 두 자리 | 05 Screen |
| `WU` | 화면설계서 작업 단위 | `WU-000` | 04 IA |
| `QA` | 검증 규칙 | `QA-00` | 06 QA |
| `BLK` | UI 블록 | `BLK-0000` | 블록 레지스트리 |
| `BRQ` | 블록 등록 요청 | `BRQ-0000` | 블록 레지스트리 |
| `FN` | 이 시스템의 기능 | `FN-000` | 기능 정의서 |
| `STU` | 뷰어 화면 | `STU-00` | 기능 정의서 |

`BRQ`는 2026-11-25에 정했습니다. 블록 레지스트리 프로토타입은 등록 요청에 `REQ-0000`을 썼는데 요구사항 ID와 접두어가 겹쳐, 요구사항을 그대로 두고 요청 쪽을 바꿨습니다. 레지스트리를 저장소로 옮길 때 기존 요청 ID도 함께 바꿉니다.

`FN`과 `STU`는 설계 대상 서비스가 아니라 이 시스템 자체의 ID라 프로젝트 폴더에 들어가지 않습니다.

## 4. 문서별 JSON 스키마

공통 필드는 되풀이하지 않고 고유 필드만 적습니다.

### project.json

| 필드 | 형 | 내용 |
| --- | --- | --- |
| `project_id` | string | 폴더 이름과 같습니다. |
| `goals` | object[] | `{ id: "GOAL-00", title, description }`. 요구사항이 `refs`로 가리킵니다. |
| `scope_in`, `scope_out` | string[] | 범위와 범위 밖 |
| `users` | object[] | `{ type, description }` |
| `confirmed` | boolean | 사람이 확정했는지. `false`면 Requirements Agent를 시작하지 않습니다(POL-007). |

`items` 배열을 쓰지 않는 유일한 파일입니다. 사람이 쓰는 입력이기 때문입니다.

### requirements.json (REQ)

| 필드 | 형 | 내용 |
| --- | --- | --- |
| `type` | `"기능"` \| `"비기능"` \| `"제약"` | |
| `group` | string | 묶음 이름 |
| `user_type` | string | 해당 사용자 유형 |
| `priority` | `"높음"` \| `"보통"` \| `"낮음"` | 미정입니다(8절). |
| `acceptance` | string[] | 수용 기준. 하나 이상 있어야 합니다. |
| `refs` | string[] | `GOAL-00` |

### policies.json (POL)

| 필드 | 형 | 내용 |
| --- | --- | --- |
| `type` | `"서비스"` \| `"운영"` | |
| `conditions` | string | 조건과 예외 |
| `permissions` | string[] | 권한. 없으면 빈 배열 |
| `states` | string[] | 이 정책이 정하는 상태값 |
| `exceptions` | string[] | 예외 처리. QA-05가 화면 영역의 `exceptions`와 맞춰 봅니다. |
| `refs` | string[] | `REQ-000`. 하나 이상 있어야 합니다. |

### user-flow.json (UF)

| 필드 | 형 | 내용 |
| --- | --- | --- |
| `step_type` | `"진입"` \| `"선택"` \| `"분기"` \| `"완료"` \| `"이탈"` | |
| `actor` | string | 행동하는 사용자 유형 |
| `next` | object[] | `{ to: "UF-000", condition, policy: "POL-000" }`. `step_type`이 `분기`면 `policy`가 필수입니다(QA-03). |
| `screen` | string \| null | 이 단계가 일어나는 화면 `SCR-000`. IA Agent가 채웁니다. |
| `refs` | string[] | `REQ-000`, `POL-000` |

### workflow.json (WF)

| 필드 | 형 | 내용 |
| --- | --- | --- |
| `step_type` | `"처리"` \| `"검증"` \| `"상태 변경"` \| `"연동"` | |
| `input`, `output` | string[] | 데이터 흐름 |
| `state_change` | object \| null | `{ target, from, to }` |
| `user_step` | string | 대응하는 `UF-000`. 모든 유저 플로우 단계에 대응이 있어야 합니다(QA-03). |
| `refs` | string[] | `REQ-000`, `POL-000`, `UF-000` |

### ia.json (SCR)

| 필드 | 형 | 내용 |
| --- | --- | --- |
| `menu` | string | 상위 메뉴 |
| `group` | string | 기능 그룹 |
| `transitions` | object[] | `{ to: "SCR-000", trigger }`. 대상 화면이 있어야 합니다(QA-04). |
| `refs` | string[] | `UF-000`, `WF-000`, `REQ-000` |

`ia.json`은 화면 항목과 함께 작업 단위 목록 `work_units`를 갖습니다. 화면설계서는 작업 단위 기준으로 작성하며(POL-035), 승인된 정보 구조도의 작업 단위가 사용자에게 주는 선택지입니다(POL-037).

| 필드 | 형 | 내용 |
| --- | --- | --- |
| `id`, `title`, `description` | string | `WU-000`, 작업 단위 이름(예: 홈), 이렇게 묶은 근거 |
| `screens` | string[] | 속한 화면 `SCR-000`. 모든 화면은 작업 단위 하나에만 속합니다(POL-036, 제안). |
| `refs` | string[] | 묶는 근거가 된 `UF-000`, `REQ-000` |

### screens/SCR-000.json

화면 한 장이 파일 하나입니다. 화면은 영역의 목록이고, 영역마다 블록·요구사항·정책을 연결합니다(POL-017).

| 필드 | 형 | 내용 |
| --- | --- | --- |
| `id`, `title` | string | `ia.json`의 `SCR-000`과 같아야 합니다. |
| `refs` | string[] | `UF-000`, `WF-000` |
| `state` | object | 화면 단위 React State의 초기값. 키는 state 이름입니다. |
| `areas` | object[] | 아래 표 |

영역(`areas`의 원소)은 다음과 같습니다.

| 필드 | 형 | 내용 |
| --- | --- | --- |
| `id` | string | `SCR-000-A00` |
| `title` | string | 영역 이름 |
| `block` | object | `{ id: "BLK-0000", version: "^1" }` (6절) |
| `props` | object | 블록 컴포넌트에 넘길 props. **키는 React 컴포넌트의 prop 이름을 그대로 씁니다**(2026-11-25 확정, POL-026). 한글 슬롯 이름은 쓰지 않습니다. |
| `requirements` | string[] | `REQ-000`. 하나 이상 있어야 합니다(QA-01). |
| `policies` | string[] | `POL-000`. 하나 이상 있어야 합니다. |
| `description` | string[] | 디스크립션 |
| `interactions` | object[] | `{ trigger, set, result }`. `set`은 `state`의 키여야 합니다. |
| `exceptions` | string[] | 예외 상황. 연결된 정책의 `exceptions`를 모두 덮어야 합니다(QA-05). |

props 키를 코드 이름으로 정한 이유는 화면설계서 JSON을 React로 그대로 렌더링하기 때문입니다(POL-026). 한글 이름을 쓰면 블록마다 이름 대응표를 따로 관리해야 하고, 그 표가 틀어지면 화면이 그려지지 않습니다. 사람이 읽는 설명은 `title`과 `description`이 맡습니다.

### validation.json (QA)

| 필드 | 형 | 내용 |
| --- | --- | --- |
| `rule` | string | `QA-01` ~ `QA-07` (기능 정의서 9절) |
| `result` | `"통과"` \| `"실패"` | |
| `targets` | string[] | 실패한 항목의 ID |
| `owner_agent` | string | 넘길 담당 에이전트 |
| `metric` | number \| null | QA-01의 요구사항 반영률처럼 수치가 있는 규칙만 |

## 5. _meta의 스키마

`_meta/`는 사람이 읽는 Markdown 짝이 없습니다. 시스템만 씁니다(POL-033).

### status.json

문서마다 한 줄입니다. 총괄 에이전트가 시작 조건을 여기서 확인합니다.

| 필드 | 형 | 내용 |
| --- | --- | --- |
| `doc` | string | `REQ`, `POL`, `UF`, `WF`, `IA`, `SB`, `QA` |
| `state` | string | 기능 정의서 6절의 다섯 가지 중 하나 |
| `approved_by` | string \| null | 승인한 사람. PR을 병합한 GitHub 사용자입니다. |
| `approved_at` | string \| null | 승인한 날 |
| `pr` | number \| null | 승인 근거가 된 PR 번호 |

에이전트는 `state`를 `승인`으로 쓸 수 없습니다(POL-002). 승인 세 필드는 PR 병합 뒤 스크립트가 채웁니다.

화면설계서(`SB`)는 작업 단위별 상태를 함께 갖습니다(POL-038). `SB` 줄의 `work_units` 배열에 작업 단위마다 `{ id: "WU-000", state, approved_by, approved_at, pr }`를 둡니다. 정보 구조도가 승인되면 작업 단위마다 `대기`로 등록하고, `SB`의 `state`는 모든 작업 단위가 승인되어야 `승인`이 됩니다.

### runs.json

실행 기록입니다. 배열이고 뒤에 덧붙이기만 합니다.

| 필드 | 형 | 내용 |
| --- | --- | --- |
| `run_id` | string | 실행 식별자 |
| `agent` | string | 에이전트 이름 |
| `started_at`, `finished_at` | string | 시각 |
| `read`, `wrote` | string[] | 읽은 파일, 만든 파일 |
| `session` | string | 이 실행을 띄운 세션의 식별자. 쓰기 전 훅이 이것으로 자물쇠의 주인을 가립니다. |
| `result` | `"진행 중"` \| `"완료"` \| `"완료 조건 미달"` \| `"중단"` | 한도에 닿아 멈추면 `중단`입니다(POL-029). |
| `attempt` | number | 같은 문서의 몇 번째 실행인지. 한도는 미정입니다(8절). |

**끝나지 않은 실행이 그 문서의 주인입니다.** 총괄은 문서 상태를 `생성 중`으로 바꾸면서 `finished_at`이 빈 실행을 함께 남기고, 끝나면 `finished_at`과 `result`를 채워 닫습니다. 상태가 `생성 중`인데 끝나지 않은 실행이 없으면 끊긴 것이며, 훅이 그 문서로의 쓰기를 막습니다. `session`을 적지 않으면 그 실행은 주인이 될 수 없어 같은 세션에서도 막힙니다. (제안)

화면설계서 실행은 대상 작업 단위를 `work_units: ["WU-000"]`로 함께 적습니다.

### changes.json

승인된 항목이 바뀐 기록입니다(POL-006, POL-033).

| 필드 | 형 | 내용 |
| --- | --- | --- |
| `change_id` | string | 변경 식별자 |
| `item_id` | string | 바뀐 항목의 ID |
| `before`, `after` | string | 이전 값과 새 값 |
| `by` | string | 바꾼 주체. 사람이면 GitHub 사용자, 에이전트면 이름 |
| `commit` | string | 커밋 해시 |
| `impact` | object[] | `{ item_id, verdict }`. `verdict`는 `"수정 필요"` 또는 `"검토 필요"`입니다(POL-018). |

## 6. UI 블록 참조 규칙

화면 영역은 블록을 ID와 Major 버전 범위로 참조합니다(POL-023).

```json
"block": { "id": "BLK-0000", "version": "^1" }
```

- `^1`은 Major 1을 뜻합니다. Minor와 Patch 변경은 그대로 받습니다.
- 블록의 Major가 올라가면 그 블록을 쓰는 영역이 수정 필요가 됩니다(POL-018).
- 폐기된 블록은 쓰지 않습니다(QA-07).
- 맞는 블록이 없으면 프로젝트 블록으로 만들고 등록 요청 `BRQ-0000`을 남깁니다(POL-024). 등록 요청 중인 블록을 쓴 영역은 검증 보고서에 따로 표시합니다.

블록의 코드 연결 정보(React 컴포넌트와 prop 이름)는 블록 레지스트리가 갖습니다. 코드 연결이 없는 블록은 와이어프레임용 컴포넌트를 따로 만들어야 하며, 누가 만드는지는 미정입니다(8절).

## 7. 검증 스크립트가 검사하는 것

프로젝트 데이터에 대해 아래를 검사합니다. 이 저장소의 `scripts/check_docs.py`가 기획 문서에 하는 검사와 같은 성격이며, 대상이 프로젝트 폴더라는 점만 다릅니다.

| 검사 | 내용 |
| --- | --- |
| 스키마 | 모든 JSON이 `schemas/`의 스키마에 맞는지 |
| 공통 필드 | 모든 항목에 여섯 필드가 있는지 |
| ID 형식과 중복 | 3절의 형식에 맞고 중복이 없는지 |
| 참조 유효성 | `refs`가 가리키는 ID가 실제로 있는지 |
| 작업 단위 | 모든 화면이 작업 단위 하나에만 속하는지, 작업 단위의 `screens`가 실제 화면인지 |
| Markdown과 JSON의 일치 | 짝이 되는 두 파일의 항목 집합과 `version`이 같은지 |
| 완료 조건 | 에이전트별 완료 조건(기능 정의서 7절)을 채웠는지 |
| 상태 정합성 | 승인된 문서가 미승인 항목을 참조하지 않는지(QA-06) |

검사는 생성 직후와 PR 단계에서 돌립니다. 순서 제어를 모델이 맡기 때문에, 규칙을 벗어난 결과가 병합되지 않도록 스크립트가 받칩니다(기능 정의서 7절).

## 8. 미정 사항

- [ ] 요구사항 우선순위 값. `priority`를 높음·보통·낮음으로 둘지, 다른 체계를 쓸지.
- [ ] 같은 문서를 에이전트가 다시 실행할 수 있는 횟수의 한도 (`attempt`, POL-008)
- [ ] 코드 연결이 없는 블록의 와이어프레임용 React 컴포넌트를 누가 만드는지
- [ ] 실제 UI 블록 ID. 형식은 `BLK-0000`으로 정했지만 레지스트리는 아직 목업입니다.
- [ ] 문구만 바뀐 변경도 `changes.json`에 남길지 (POL-006)
- [ ] `schemas/`의 JSON Schema 파일 작성. 이 문서는 필드와 형만 정했습니다.
- [ ] 이 문서에서 제안으로 표시한 것: `project-id` 형식, 폐기 표시(`deprecated`), 파일 공통 머리 필드
- [ ] 화면을 작업 단위로 묶는 기준과 공통 화면의 처리 (POL-036)

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
| --- | --- | --- |
| 0.0.0 | 2026-11-25 | 자리 만듦 |
| 0.1.0 | 2026-11-25 | 최초 작성. 폴더 구조, 공통 필드와 ID 규칙, 문서별 스키마 8개, _meta 3개, 블록 참조 규칙, 검증 항목 |
| 0.2.0 | 2026-11-25 | 작업 단위(WU-000)를 추가. ia.json의 work_units, status.json의 작업 단위별 상태, runs.json의 대상 작업 단위, 검사 항목 |
| 0.3.0 | 2026-11-26 | runs.json에 `session`을 더하고 `result`에 `진행 중`을 더함. 끝나지 않은 실행이 문서의 주인이라는 규칙을 적음 |
