import { useMemo, useState } from "react";
import type { Area } from "../data/load";
import { AreaSlot } from "./AreaSlot";
import { lookup } from "./blockRegistry";
import type { State } from "./resolveProps";
import styles from "./Wireframe.module.css";

/* BRQ-0011 와이어프레임 — SCR-005-A03.
 *
 * 다른 블록을 품어 화면 한 장을 그리고 그 안의 영역을 고르게 하는 자리다.
 * 라이브러리에 이런 블록이 없어 프로젝트 블록으로 만들고 등록 요청을 남겼다.
 *
 * 하는 일 셋 (화면설계서 SCR-005-A03)
 *   1. 화면 파일의 `areas`를 **적힌 순서대로** 그린다. 더하거나 빼거나 자리를 바꾸지 않는다.
 *   2. 블록을 못 찾으면 그 자리에 블록 ID와 안내를 보이고 나머지는 그대로 그린다.
 *   3. `interactions`를 눌러 보게 하고 `set`이 가리키는 키를 `previewState` 안에서 바꾼다.
 *      서버 없이 React State로만 돈다(REQ-017, POL-014).
 *
 * `previewState`는 **그려진 화면의 것**이고 뷰어 자신의 state와 섞지 않는다.
 * 화면설계서 11절이 넘긴 '두 겹 state'가 이 자리다. */

export interface WireframeProps {
  /** 그릴 영역. 화면 파일의 `areas` 순서 그대로 받는다. */
  areas: Area[];
  /** 고른 영역. 없으면 null. */
  selectedAreaId?: string | null;
  onSelectArea?: (areaId: string) => void;
  /** 그려진 화면이 쓰는 state. 화면 파일의 `state`로 초기화한다. */
  previewState?: State;
  onPreviewStateChange?: (next: State) => void;
  /** 블록을 못 찾았을 때 그 자리에 보일 말. */
  unrenderedMessage?: string;
  /** 영역이 하나도 없을 때 보일 말. */
  emptyMessage?: string;
}

export function Wireframe({
  areas,
  selectedAreaId = null,
  onSelectArea,
  previewState,
  onPreviewStateChange,
  unrenderedMessage = "블록을 그리지 못했습니다",
  emptyMessage = "영역이 없습니다",
}: WireframeProps) {
  // 바깥이 previewState를 쥐지 않으면 여기서 쥔다. 어느 쪽이든 React State뿐이다.
  const [own, setOwn] = useState<State>({});
  const state = previewState ?? own;

  const setState = useMemo(
    () => (key: string, value: unknown) => {
      const next = { ...state, [key]: value };
      if (onPreviewStateChange) onPreviewStateChange(next);
      else setOwn(next);
    },
    [state, onPreviewStateChange],
  );

  if (areas.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>;
  }

  const unrendered = areas.filter((a) => !lookup(a.block.id)).length;

  return (
    <div className={styles.frame}>
      {unrendered > 0 && (
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
          selected={area.id === selectedAreaId}
          onSelect={() => onSelectArea?.(area.id)}
          unrenderedMessage={unrenderedMessage}
        />
      ))}
    </div>
  );
}
