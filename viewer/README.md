# viewer — UX AI Studio

설계 문서를 사람이 읽는 화면으로 보여 주는 읽기 전용 앱입니다. 설계는
[화면설계서](../projects/ux-ai-studio/STORYBOARD.md)가 정하고, 만드는 순서는
[구현 계획](../docs/IMPLEMENTATION_PLAN.md)이 정합니다.

```
npm install
npm run dev      # 개발 서버
npm run build    # 정적 파일 (dist/)
npm test         # 시험
```

## 지금 어디까지 왔는가

**A-0 뼈대까지입니다.** 블록은 하나도 없습니다.

| 작업 | 상태 |
| --- | --- |
| A-0 뷰어 뼈대 | 됨 |
| A-1 `BRQ-0011` 와이어프레임 | 다음 |
| A-2 ~ A-9 P0 블록 여덟 | 아직 |
| A-10 ~ A-19 P1 블록 열 | 아직 |

화면 일곱 장은 지금 `ScreenStub`이 **영역 목록만** 보입니다. 영역을 실제로
그리는 것은 `BRQ-0011`이 서야 됩니다(A-1). 그때 `ScreenStub`은 렌더러를 부르는
얇은 껍데기가 됩니다.

## 코드가 지켜야 할 경계

[개발 아키텍처](../docs/10-dev-architecture.md) 9절이 정한 것입니다. 리뷰에서
이것부터 봅니다.

| 경계 | 깨지는 모습 | 근거 |
| --- | --- | --- |
| 저장소에 쓰지 않는다 | POST 호출이나 쓰기 토큰이 생긴다 | POL-034 |
| 승인하지 않는다 | 승인 버튼이 생긴다. 승인은 PR 병합뿐이다 | POL-002 |
| 에이전트를 실행하지 않는다 | 실행 버튼이 생긴다. 1차는 세션 링크만 둔다 | FSD 7절 |
| 파일 접근은 `data/load.ts`를 거친다 | 화면이 `../../projects/...`를 직접 안다 | DEV 5.2절 |
| 항목 ID는 바뀌지 않는다 | 코드가 ID를 다시 매기거나 재사용한다 | POL-014 |

### 데이터를 읽는 방법

`src/data/load.ts`가 **유일한 통로**입니다. `import.meta.glob`으로 빌드할 때
`projects/` 아래의 JSON을 묶어 들어오므로 **실행 중에는 저장소를 읽지 않습니다.**
서버가 필요 없고 네트워크도 쓰지 않습니다.

그래서 **"읽은 시점"은 곧 빌드 시점**입니다(`READ_AT`). POL-004가 화면에 함께
보이라고 정한 값이고, 새로고침은 페이지를 다시 불러 새 빌드를 받는 것을 뜻합니다.

### 번들의 `fetch` 한 줄에 대하여

빌드 결과에 `fetch(e.href)`가 하나 있습니다. **Vite의 modulepreload 폴리필**이
자기 자산(`<link rel=modulepreload>`)을 받는 same-origin GET이고, 저장소에 쓰는
것이 아닙니다. POST·PUT·DELETE·PATCH는 0건입니다.

[MVP 수용 기준](../docs/MVP_ACCEPTANCE_CRITERIA.md)의 AC-03("빌드 결과에 네트워크
쓰기 호출이 없다")을 기계로 볼 때 이 줄에 걸리지 않게 해야 합니다. 보는 것은
**쓰기 메서드와 바깥 호스트**이지 `fetch`라는 글자가 아닙니다.

## 토큰

`src/tokens/tokens.css`가 레지스트리의 `spec.tokens` 이름을 CSS 변수로 받습니다.
이름은 `/`를 `-`로 바꾼 것입니다.

```
color/bg/surface  →  --color-bg-surface
```

블록 컴포넌트는 색·여백·타이포에 값을 직접 적지 않고 이 변수만 씁니다.
**값은 아직 제안입니다.** 레지스트리의 토큰은 이름만 있고 값이 없어, 실제 값은
Figma에서 와야 합니다.

## 라우팅

`HashRouter`입니다. 정적 호스팅에서 서버 설정 없이 돌아야 하기 때문입니다.
`BrowserRouter`는 새로고침할 때 서버가 모든 경로를 `index.html`로 보내 줘야 합니다.

화면 간 이동 21건은 `ia.json`의 `transitions`가 정합니다. A-0에서는 화면마다
자리만 잡아 두었고, 이동을 실제로 엮는 것은 08 Wireframe Rendering입니다.

## 폴더

```
src/
├── tokens/     레지스트리 토큰 → CSS 변수
├── data/       저장소를 읽는 유일한 통로
├── blocks/     블록 컴포넌트 (아직 비어 있음. A-2부터)
├── render/     영역 렌더러 (아직 비어 있음. A-1)
├── screens/    화면
├── Shell.tsx   틀. 글로벌 헤더 자리는 A-2에서 블록으로 바뀐다
└── router.tsx
```
