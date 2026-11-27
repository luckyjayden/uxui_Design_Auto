import type { Area } from "../data/load";
import { lookup } from "./blockRegistry";
import { resolveProps, type SetState, type State } from "./resolveProps";
import styles from "./AreaSlot.module.css";

/* 영역 하나가 앉는 자리다.
 *
 * 블록을 찾으면 그 블록을 그리고, 못 찾으면 **건너뛰지 않고** 블록 ID와 안내를
 * 보인다(SCR-005-A03의 예외). 그래서 영역의 수는 그린 쪽이든 못 그린 쪽이든
 * 화면 파일과 늘 같다.
 *
 * `chrome`이 참이면 영역 ID·블록 ID 머리와 인터랙션 버튼을 함께 보인다.
 * **미리보기(BRQ-0011)에서만 참이다.** 뷰어의 진짜 화면에서는 블록만 보인다. */

interface Props {
  area: Area;
  state: State;
  setState: SetState;
  selected: boolean;
  onSelect: () => void;
  unrenderedMessage: string;
  /** 미리보기 장치(영역 머리와 인터랙션)를 보일지. 기본은 끔. */
  chrome?: boolean;
}

export function AreaSlot({
  area,
  state,
  setState,
  selected,
  onSelect,
  unrenderedMessage,
  chrome = false,
}: Props) {
  const Block = lookup(area.block.id);

  return (
    <section
      className={`${chrome ? styles.slot : styles.plain} ${selected ? styles.selected : ""}`}
      data-area-id={area.id}
      data-block-id={area.block.id}
      data-rendered={Block ? "true" : "false"}
      aria-labelledby={`${area.id}-label`}
    >
      {chrome && (
        <button type="button" className={styles.head} onClick={onSelect}>
          <span className={styles.areaId}>{area.id}</span>
          <span id={`${area.id}-label`} className={styles.title}>
            {area.title}
          </span>
          <span className={styles.blockId}>{area.block.id}</span>
        </button>
      )}

      <div className={chrome ? styles.body : styles.bare}>
        {Block ? (
          <Block {...resolveProps(area.props, state, setState)} />
        ) : (
          <p className={styles.unrendered}>
            <span className={styles.blockId}>{area.block.id}</span>
            {unrenderedMessage}
          </p>
        )}
      </div>

      {chrome && area.interactions.length > 0 && (
        <Interactions area={area} state={state} setState={setState} />
      )}
    </section>
  );
}

/* 영역의 인터랙션을 눌러 보게 한다.
 *
 * `set`이 가리키는 키가 그 화면의 state에 없으면 눌러도 아무 일도 일어나지
 * 않고 '인터랙션을 돌리지 못했습니다'를 보인다(SCR-005-A03의 예외).
 * `set`이 null인 것은 바깥으로 나가거나 상태를 바꾸지 않는 것이라 누를 자리를
 * 두되 값을 바꾸지 않는다. */
function Interactions({
  area,
  state,
  setState,
}: {
  area: Area;
  state: State;
  setState: SetState;
}) {
  return (
    <ul className={styles.interactions}>
      {area.interactions.map((it, i) => {
        const key = it.set;
        const broken = key !== null && !Object.prototype.hasOwnProperty.call(state, key);
        return (
          <li key={i} className={styles.interaction}>
            <button
              type="button"
              className={styles.trigger}
              disabled={broken}
              onClick={() => {
                if (key === null || broken) return;
                // 누를 때마다 바뀌었다는 것만 보이면 된다. 블록이 서면 블록이
                // 제 값을 넘긴다. 여기서는 그 자리까지만 만든다.
                setState(key, { pressed: it.trigger, at: state[key] });
              }}
            >
              {it.trigger}
            </button>
            {broken ? (
              <span className={styles.broken}>
                인터랙션을 돌리지 못했습니다 — state에 <code>{key}</code>가 없습니다
              </span>
            ) : (
              <span className={styles.result}>{it.result}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
