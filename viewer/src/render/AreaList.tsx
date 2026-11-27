import type { Area } from "../data/load";
import { AreaSlot } from "./AreaSlot";
import { lookup } from "./blockRegistry";
import type { SetState, State } from "./resolveProps";
import styles from "./AreaList.module.css";

/* 영역을 적힌 순서 그대로 늘어놓는 공통 부분이다.
 *
 * 쓰는 자리가 둘이고 **보이는 것이 다르다.**
 *
 *   뷰어의 진짜 화면 (ScreenView)   chrome=false. 블록만 보인다
 *   미리보기 (Wireframe, BRQ-0011)  chrome=true.  영역 ID·블록 ID·인터랙션을 함께 보인다
 *
 * 영역 ID 배지와 인터랙션 버튼은 **미리보기의 장치**다. 사용자가 쓰는 화면에
 * 그것이 보이면 안 된다. SCR-001은 프로젝트 목록이지 와이어프레임이 아니다. */

export interface AreaListProps {
  areas: Area[];
  state: State;
  setState: SetState;
  /** 미리보기 장치를 보일지. 기본은 끔 — 진짜 화면이 기본이다. */
  chrome?: boolean;
  selectedAreaId?: string | null;
  onSelectArea?: (areaId: string) => void;
  unrenderedMessage?: string;
  emptyMessage?: string;
  /** 아직 못 그린 자리가 몇인지 알려 줄지. 블록을 채우는 동안만 쓴다. */
  showProgress?: boolean;
  /**
   * 영역마다 덧씌울 props. 화면 사이를 옮기는 핸들러가 여기로 들어온다.
   * 진짜 화면만 넘긴다. 미리보기는 넘기지 않아 눌러도 화면이 바뀌지 않는다.
   */
  overridesFor?: (area: Area) => Record<string, unknown> | undefined;
}

export function AreaList({
  areas,
  state,
  setState,
  chrome = false,
  selectedAreaId = null,
  onSelectArea,
  unrenderedMessage = "블록을 그리지 못했습니다",
  emptyMessage = "영역이 없습니다",
  showProgress = false,
  overridesFor,
}: AreaListProps) {
  if (areas.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>;
  }

  const unrendered = areas.filter((a) => !lookup(a.block.id)).length;

  return (
    <div className={styles.list}>
      {showProgress && unrendered > 0 && (
        <p className={styles.progress}>
          영역 {areas.length}개 가운데 <strong>{areas.length - unrendered}개</strong>를
          그렸습니다. 나머지 {unrendered}개는 블록이 아직 없습니다.
        </p>
      )}
      {areas.map((area) => (
        <AreaSlot
          key={area.id}
          area={area}
          state={state}
          setState={setState}
          chrome={chrome}
          selected={area.id === selectedAreaId}
          onSelect={() => onSelectArea?.(area.id)}
          unrenderedMessage={unrenderedMessage}
          overrides={overridesFor?.(area)}
        />
      ))}
    </div>
  );
}
