import { useState } from "react";
import { useParams } from "react-router-dom";
import { screen } from "../data/load";
import { AreaList } from "../render/AreaList";
import type { State } from "../render/resolveProps";
import styles from "./ScreenView.module.css";

/* 뷰어의 **진짜 화면**이다. 미리보기가 아니다.
 *
 * 영역을 적힌 순서대로 그리되 영역 ID 배지도 인터랙션 버튼도 보이지 않는다.
 * 그것은 와이어프레임(BRQ-0011)의 장치이고, SCR-005 안에서만 켜진다.
 * SCR-001은 프로젝트 목록이지 와이어프레임이 아니다.
 *
 * 블록이 차면 이 화면은 블록만으로 선다. 지금은 블록이 거의 없어 자리마다
 * '블록을 그리지 못했습니다'가 보이고, 맨 위에 몇 개가 남았는지 알려 준다.
 * **그 줄은 블록을 다 만들면 저절로 사라진다.** */
export function ScreenView({ screenId }: { screenId: string }) {
  const { projectId } = useParams();
  const data = projectId ? screen(projectId, screenId) : null;

  // 화면이 쓰는 state. 화면 파일의 `state`로 초기화한다.
  const [state, setState] = useState<State | null>(null);

  if (!data) {
    return (
      <p className={styles.missing}>
        {screenId}을 읽지 못했습니다. 화면 파일이 없습니다.
      </p>
    );
  }

  const current = state ?? data.state;

  return (
    <section>
      <h1 className={styles.title}>
        <span className={styles.id}>{data.id}</span>
        {data.title}
      </h1>

      <AreaList
        areas={data.areas}
        state={current}
        setState={(key, value) => setState({ ...current, [key]: value })}
        showProgress
        unrenderedMessage="블록을 그리지 못했습니다"
        emptyMessage="영역이 없습니다"
      />
    </section>
  );
}
