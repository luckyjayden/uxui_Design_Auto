/* 화면 파일의 `props`를 블록에 넘길 실제 값으로 바꾼다.
 *
 * 데이터 규격 4절은 props의 키를 React prop 이름으로 두고(POL-026), 값에는
 * 그 화면 `state`의 키나 글자 그대로의 값을 적게 했다. 둘을 가르는 규칙은 하나다.
 *
 *   값이 그 화면 state의 키면  → 그 state의 값
 *   아니면                     → 글자 그대로
 *
 * 화면설계서 11절이 넘긴 두 가지도 여기서 받는다.
 *   - 값이 state 키의 **배열**인 것 (`"groups": ["parentRefs", "childRefs"]`)
 *   - 값이 글자 그대로의 **배열**인 것 (`"sectionLabels": ["디스크립션", "예외"]`)
 *
 * `on`으로 시작하는 prop의 값이 state 키면 **그 키를 바꾸는 콜백**이 된다.
 * `"onSelectArea": "selectedAreaId"`는 "누르면 selectedAreaId를 바꾼다"는 뜻이다.
 */

export type State = Record<string, unknown>;
export type SetState = (key: string, value: unknown) => void;

function isKey(state: State, v: unknown): v is string {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(state, v);
}

/** 값 하나를 푼다. 배열이면 원소마다 푼다. */
function resolveValue(state: State, v: unknown): unknown {
  if (Array.isArray(v)) return v.map((x) => resolveValue(state, x));
  return isKey(state, v) ? state[v] : v;
}

/**
 * @param props  영역의 `props`
 * @param state  그 화면의 state (뷰어 자신의 것이든 previewState든)
 * @param set    state를 바꾸는 함수. 없으면 콜백을 만들지 않는다
 */
export function resolveProps(
  props: Record<string, unknown>,
  state: State,
  set?: SetState,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith("on") && isKey(state, value)) {
      const stateKey = value;
      out[key] = set ? (next: unknown) => set(stateKey, next) : undefined;
      continue;
    }
    out[key] = resolveValue(state, value);
  }
  return out;
}

/** 그 영역이 어떤 state 키를 읽는지. 어느 영역이 무엇에 걸려 있는지 보는 데 쓴다. */
export function readsKeys(props: Record<string, unknown>, state: State): string[] {
  const keys = new Set<string>();
  const walk = (v: unknown) => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (isKey(state, v)) keys.add(v);
  };
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith("on")) continue;
    walk(value);
  }
  return [...keys].sort();
}
