import { useState } from "react";
import { useParams } from "react-router-dom";
import { READ_AT, screen } from "../data/load";
import { AreaList } from "../render/AreaList";
import { lookup } from "../render/blockRegistry";
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

  // 읽은 시점은 뷰어가 저장소를 읽어 온 때다. 데이터가 빌드할 때 묶여 들어오므로
  // 그것이 곧 빌드 시점이다(viewer/README.md). 화면 파일의 초기값은 null이라
  // 여기서 채워 준다. 지어내는 값이 아니라 실제로 읽은 때다.
  const current = state ?? { ...data.state, repoReadAt: READ_AT };

  // 진도는 화면의 **모든** 영역을 센다. 헤더를 따로 그린다고 수에서 빼지 않는다.
  const unrendered = data.areas.filter((a) => !lookup(a.block.id)).length;

  // 헤더(A01)는 화면 폭을 다 쓰고 나머지는 가운데로 모은다.
  const [header, ...rest] = data.areas;
  const setAt = (key: string, value: unknown) => setState({ ...current, [key]: value });

  return (
    <section>
      {header?.block.id === "BLK-0001" ? (
        <AreaList areas={[header]} state={current} setState={setAt} />
      ) : null}

      <div className={styles.body}>
        <h1 className={styles.title}>
          <span className={styles.id}>{data.id}</span>
          {data.title}
        </h1>

        {unrendered > 0 && (
          <p className={styles.progress}>
            영역 {data.areas.length}개 가운데{" "}
            <strong>{data.areas.length - unrendered}개</strong>를 그렸습니다. 나머지{" "}
            {unrendered}개는 블록이 아직 없습니다.
          </p>
        )}

        <AreaList
          areas={header?.block.id === "BLK-0001" ? rest : data.areas}
          state={current}
          setState={setAt}
          unrenderedMessage="블록을 그리지 못했습니다"
          emptyMessage="영역이 없습니다"
        />
      </div>
    </section>
  );
}
