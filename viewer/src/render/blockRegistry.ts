import type { ComponentType } from "react";
import { Wireframe } from "./Wireframe";

/* 블록 ID → 컴포넌트 대응표.
 *
 * **이것이 블록을 찾는 유일한 자리다.** 화면이나 렌더러가 컴포넌트를 직접
 * import하지 않는다. 여기에 없는 블록은 '그리지 못한 블록'이 된다.
 *
 * 블록을 만들 때마다(A-2 ~ A-19) 한 줄씩 는다. 지금은 A-1에서 만든 와이어프레임
 * 하나뿐이라 나머지 자리는 전부 안내로 그려진다. 그 빈칸이 남은 일의 목록이다.
 *
 * 키는 화면 파일의 `block.id`와 글자 그대로 같아야 한다. `BLK-0001`처럼
 * 라이브러리 블록이든 `BRQ-0008`처럼 등록 요청 중인 프로젝트 블록이든
 * 같은 표에 둔다. 화면은 둘을 가리지 않는다. */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BlockComponent = ComponentType<any>;

const REGISTRY: Record<string, BlockComponent> = {
  // A-1에서 만들었다. 와이어프레임은 자기 자신도 그린다 — SCR-005-A03이
  // 이 블록을 가리키므로, 화면설계서 뷰어를 열면 와이어프레임 안에
  // 와이어프레임이 한 겹 더 선다. 안쪽은 고른 화면의 영역을 그린다.
  "BRQ-0011": Wireframe,

  // A-2  BLK-0001: GlobalHeader,
  // A-3  BLK-0020: TabContent,
  // A-4  BLK-0003: ButtonGroup,
  // A-5  BLK-0012: EmptyState,
  // A-6  BRQ-0008: RefPanel,
  // A-7  BRQ-0013: BlockRefList,
  // A-8  BRQ-0012: AreaDetailPanel,
  // A-9  BRQ-0010: ExportStatusBar,
};

/** 그 블록의 컴포넌트. 아직 만들지 않았으면 undefined. */
export function lookup(blockId: string): BlockComponent | undefined {
  return REGISTRY[blockId];
}

/** 만들어 둔 블록 ID 전부. 진도를 세는 데 쓴다. */
export function registered(): string[] {
  return Object.keys(REGISTRY).sort();
}
