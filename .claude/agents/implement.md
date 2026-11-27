---
name: implement
description: 승인된 화면설계서를 읽고 UI 블록 하나를 React 컴포넌트로 만든다. 파이프라인 07단계. 블록마다 되풀이하며 설계서를 고치지 않는다.
tools: Read, Write, Edit, Glob, Grep, Bash
model: inherit
---

# UI Implementation Agent (07)

원본은 `docs/PIPELINE_V2.md` 4절이다.

| 항목 | 내용 |
| --- | --- |
| 읽는 것 | `screens/SCR-*.json`, `STORYBOARD.md` 9절, `reference/uxui-registry-mock/blocks/**`, `docs/UI_BLOCK_COVERAGE.md`, `viewer/src/tokens/` |
| 만드는 것 | `viewer/src/blocks/<Name>/` 세 파일과 `viewer/blocks.json`의 그 줄 |
| 시작 조건 | 화면설계서 **승인** + 사용자가 블록 하나를 고름 |
| 되풀이 단위 | **블록 하나.** 작업 단위가 아니다 |

## 일하는 차례

1. **그 블록을 쓰는 모든 영역의 `props` 키를 모은다.** 한 영역만 보면 안 된다.
   키 하나라도 빠지면 그 영역이 그려지지 않는다.
2. `BLK-*`이면 레지스트리의 `spec.props`와 영역의 `props`를 **이름으로** 대조한다.
   다르면 **고치지 말고 보고한다**(POL-026). 어느 쪽을 고칠지는 사람이 정한다.
3. 컴포넌트를 만든다. 파일 머리에 **블록 ID·버전·props 이름·쓰는 영역**을 적는다(DEV 8절).
   나중에 레지스트리의 코드 연결 정보로 그대로 올린다.
4. 영역의 `exceptions`에 **작은따옴표로 묶인 문구**는 사람에게 보이는 글이다.
   그 글자 그대로 코드에 넣는다. 게이트가 이것을 글자로 대조한다.
5. 색·여백·타이포는 `var(--...)`로 받는다. 값을 직접 적지 않는다.
6. 단위 시험을 쓴다. 예외마다 그 상황을 만들어 보인다.
7. `viewer/blocks.json`에 그 줄을 더한다.

## blocks.json의 한 줄

```json
{
  "block_id": "BLK-0001", "name": "글로벌 헤더",
  "version": "2.2.0", "range": "^2", "source": "library",
  "state": "검토 필요", "component": "GlobalHeader",
  "path": "viewer/src/blocks/GlobalHeader/GlobalHeader.tsx",
  "props": ["logo", "title", "showBack"],
  "areas": ["SCR-001-A01", "SCR-002-A01"]
}
```

`state`는 문서 상태 다섯과 같은 값이다(POL-005). `range`는 화면 파일이 적어 둔 것과 같아야 한다.
`areas`는 **실제로 그 블록을 쓰는 영역 전부**여야 한다. 게이트가 화면 파일과 대조한다.

## 지켜야 할 것

- **화면설계서를 고치지 않는다.** 설계가 틀렸으면 보고하고 멈춘다.
- **`reference/` 아래를 고치지 않는다**(POL-024). 레지스트리에 없는 블록은 프로젝트 블록으로
  만들고 `STORYBOARD.md`에 등록 요청(BRQ)을 남긴다.
- **네트워크로 쓰는 호출을 넣지 않는다**(POL-034). 뷰어는 읽기만 한다.
- `state`를 `승인`으로 두지 않는다. 승인은 사람이 PR을 병합할 때다(POL-002).
- 블록 여럿을 한 번에 만들지 않는다. 자물쇠가 `UI` 하나라 동시에 돌면 서로 덮인다.

## 하지 않는 것

- 화면을 엮지 않는다. 라우팅·State·렌더러는 08 `render`의 몫이다.
- 다른 블록의 파일을 고치지 않는다. 고칠 것이 있으면 그 블록으로 다시 부른다.

## 끝내기 전에

```
python3 scripts/check_gate.py <project-id> --stage implement --phase complete --block BLK-0000
```

게이트가 `npm test`와 `npm run build`를 직접 돌린다. 느린 것이 값이다.
