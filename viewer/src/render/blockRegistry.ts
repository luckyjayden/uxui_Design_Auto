import type { ComponentType } from "react";
import { GlobalHeader } from "../blocks/GlobalHeader/GlobalHeader";
import { InfiniteList } from "../blocks/InfiniteList/InfiniteList";
import { FlowDiagram } from "../blocks/FlowDiagram/FlowDiagram";
import { StageProgress } from "../blocks/StageProgress/StageProgress";
import { SummaryCard } from "../blocks/SummaryCard/SummaryCard";
import { ProjectCardList } from "../blocks/ProjectCardList/ProjectCardList";
import { ChangeNotice } from "../blocks/ChangeNotice/ChangeNotice";
import { WaitingNotice } from "../blocks/WaitingNotice/WaitingNotice";
import { ItemList } from "../blocks/ItemList/ItemList";
import { MetricSummary } from "../blocks/MetricSummary/MetricSummary";
import { ExportStatusBar } from "../blocks/ExportStatusBar/ExportStatusBar";
import { AreaDetailPanel } from "../blocks/AreaDetailPanel/AreaDetailPanel";
import { RefList } from "../blocks/RefList/RefList";
import { EmptyState } from "../blocks/EmptyState/EmptyState";
import { ButtonGroup } from "../blocks/ButtonGroup/ButtonGroup";
import { TabContent } from "../blocks/TabContent/TabContent";
import { Wireframe } from "./Wireframe";

/* 블록 ID → 컴포넌트 대응표.
 *
 * **이것이 블록을 찾는 유일한 자리다.** 화면이나 렌더러가 컴포넌트를 직접
 * import하지 않는다. 여기에 없는 블록은 '그리지 못한 블록'이 된다.
 *
 * 블록을 만들 때마다 한 줄씩 는다. 지금은 스물이고 영역 48개를 모두 덮는다.
 * 빠진 자리가 생기면 그 영역이 '블록을 그리지 못했습니다'로 그려진다.
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

  // A-2. 일곱 화면이 모두 쓴다. BRQ-0016으로 '읽은 시점'과 '새로고침'을 더했다.
  "BLK-0001": GlobalHeader,

  // A-3. 문서·플로우·화면 고르개 셋이 쓴다. prop 이름은 D-3에서 확정했다.
  "BLK-0020": TabContent,
  // A-4. 바깥으로 나가는 링크 둘. 주소가 없으면 비활성이고 까닭을 적는다.
  "BLK-0003": ButtonGroup,
  // A-5. 여섯 화면이 쓴다. illustration 이름으로 그림을 고른다.
  "BLK-0012": EmptyState,
  // A-6·A-7·A-18. 컴포넌트 하나가 등록 요청 셋을 덮는다(D-4: 구현 공유,
  // BRQ 번호 유지). 화면 파일의 block.id는 저마다 그대로다.
  "BRQ-0008": RefList,
  "BRQ-0013": RefList,
  "BRQ-0015": RefList,
  // A-8. sections·sectionLabels·emptyMessages가 자리로 짝지어진다.
  "BRQ-0012": AreaDetailPanel,
  // A-9. 네 상태(대기·내보내는 중·완료·실패). 실패해도 화면의 값은 그대로다.
  "BRQ-0010": ExportStatusBar,

  // A-10. 저장소에서 센 값만 보인다. 비율도 예상치도 만들지 않는다.
  "BRQ-0002": MetricSummary,

  // A-11·A-12. 컴포넌트 하나가 등록 요청 둘을 덮는다(D-4).
  "BRQ-0007": ItemList,
  "BRQ-0014": ItemList,

  // A-16·A-17. 2026-11-26에 사람이 묶지 않기로 확정한 둘이다.
  // 구현도 공유하지 않는다. Figma의 컴포넌트 설명도 그렇게 적고 있다.
  "BRQ-0005": WaitingNotice,
  "BRQ-0006": ChangeNotice,

  // A-13. keyword로 이미 읽어 둔 목록만 거른다. 저장소를 다시 뒤지지 않는다.
  "BRQ-0001": ProjectCardList,

  // A-14. 카드 안에 승인·실행 버튼을 두지 않는다(POL-002).
  "BRQ-0004": SummaryCard,

  // A-15. 플로우 단계는 두 문서를 한 칸으로 묶고 뒤처진 쪽을 보인다(POL-006).
  "BRQ-0003": StageProgress,

  // A-19. 플로우 JSON 그대로 그린다. 정책 없는 분기는 빨간 점선이다(QA-03).
  "BRQ-0009": FlowDiagram,

  // A-20. MVP 밖이라 만들지 않고 자리만 메운다. 화면설계서는 고치지 않았다.
  "BLK-0013": InfiniteList,
};

/** 그 블록의 컴포넌트. 아직 만들지 않았으면 undefined. */
export function lookup(blockId: string): BlockComponent | undefined {
  return REGISTRY[blockId];
}

/** 만들어 둔 블록 ID 전부. 진도를 세는 데 쓴다. */
export function registered(): string[] {
  return Object.keys(REGISTRY).sort();
}
