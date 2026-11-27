import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { screen, type Area } from "../data/load";
import { buildState, type UiState } from "../data/screenState";
import { AreaList } from "../render/AreaList";
import { lookup } from "../render/blockRegistry";
import { pathTo, wire, type NavContext } from "./transitions";
import styles from "./ScreenView.module.css";

/* 뷰어의 **진짜 화면**이다. 미리보기가 아니다.
 *
 * 영역을 적힌 순서대로 그리되 영역 ID 배지도 인터랙션 버튼도 보이지 않는다.
 * 그것은 와이어프레임(BRQ-0011)의 장치이고, SCR-005 안에서만 켜진다.
 * SCR-001은 프로젝트 목록이지 와이어프레임이 아니다.
 *
 * 블록이 차면 이 화면은 블록만으로 선다. 지금은 블록이 거의 없어 자리마다
 * '블록을 그리지 못했습니다'가 보이고, 맨 위에 몇 개가 남았는지 알려 준다.
 * **그 줄은 블록을 다 만들면 저절로 사라진다.**
 *
 * `ia.json`의 이동은 `transitions.ts`가 영역마다 덧씌운다. 어느 영역의 어느
 * prop이 방아쇠인지는 거기 적혀 있고 여기서는 그것을 그대로 넘길 뿐이다. */
export function ScreenView({ screenId }: { screenId: string }) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const data = projectId ? screen(projectId, screenId) : null;

  // 옮겨 오면서 들고 온 것. '그 항목을 고른 채로 연다'가 이 자리다.
  const carried = (location.state as UiState | null) ?? {};
  // 사람이 고른 것만 쥔다. 나머지는 저장소에서 끌어낸다.
  const [ui, setUi] = useState<UiState>(carried);
  // 옮겨 왔으면 앞 화면에서 고른 것을 들고 있지 않는다. 들고 온 것으로 갈아 끼운다.
  const [cameFrom, setCameFrom] = useState(location.key);
  if (cameFrom !== location.key) {
    setCameFrom(location.key);
    setUi(carried);
  }

  if (!data) {
    return (
      <p className={styles.missing}>
        {screenId}을 읽지 못했습니다. 화면 파일이 없습니다.
      </p>
    );
  }

  // 화면 파일의 state 키를 저장소 데이터로 채운다(src/data/screenState.ts).
  const current = buildState(projectId!, screenId, ui);

  // 진도는 화면의 **모든** 영역을 센다. 헤더를 따로 그린다고 수에서 빼지 않는다.
  const unrendered = data.areas.filter((a) => !lookup(a.block.id)).length;

  // 헤더(A01)는 화면 폭을 다 쓰고 나머지는 가운데로 모은다.
  const [header, ...rest] = data.areas;
  // 블록이 state를 바꾸면 '고른 것'으로 받아 둔다. 저장소에서 끌어낸 값은
  // 다음 그림에서 다시 계산되므로 여기 쌓지 않는다.
  const setAt = (key: string, value: unknown) =>
    setUi((prev) => ({ ...prev, [key]: value as never }));

  const nav: NavContext = {
    projectId: projectId!,
    screenId,
    ui,
    go: (to, carry = {}, pid = projectId!) => navigate(pathTo(pid, to), { state: carry }),
    set: (patch) => setUi((prev) => ({ ...prev, ...patch })),
  };
  const overridesFor = (area: Area) => wire(area, nav);

  return (
    <section>
      {header?.block.id === "BLK-0001" ? (
        <AreaList
          areas={[header]}
          state={current}
          setState={setAt}
          overridesFor={overridesFor}
        />
      ) : null}

      <div className={styles.body}>
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
          overridesFor={overridesFor}
        />
      </div>
    </section>
  );
}
