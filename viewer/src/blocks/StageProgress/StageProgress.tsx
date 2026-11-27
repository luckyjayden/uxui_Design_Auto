import dot from "../../assets/icons/dot.svg";
import { Badge, toneOf } from "../../base/Badge/Badge";
import styles from "./StageProgress.module.css";

/* BRQ-0003 일곱 단계 진행 표시
 *
 * 디자인   Figma 6sNGJRUgMlVSCDuym6e08z  node 6:737 (Block/StageProgress)
 * 쓰는 곳   SCR-002-A04
 *
 * 단계 순서는 고정이다. 프로젝트 정의서 → 요구사항 → 정책서 →
 * 유저·워크 플로우 → 정보 구조도 → 화면설계서 → 검증.
 *
 * **플로우 단계는 두 문서를 한 칸으로 묶고 뒤처진 쪽을 단계 상태로 삼는다**
 * (POL-006). 뒤처진 쪽은 POL-005가 정한 차례에서 앞에 오는 쪽이다.
 * 펼치면 문서마다 상태를 따로 보인다. */

/** POL-005가 정한 다섯 상태의 앞뒤 차례. 앞일수록 뒤처진 것이다. */
const ORDER = ["대기", "수정 필요", "생성 중", "검토 필요", "승인"];

/** 묶인 상태 가운데 뒤처진 쪽을 고른다(POL-006). */
export function behind(states: (string | null | undefined)[]): string | null {
  const known = states.filter((s): s is string => Boolean(s));
  if (known.length === 0) return null;
  // '알 수 없음'이 섞이면 차례에 두지 않고 '알 수 없음'으로 본다(POL-005).
  if (known.some((s) => !ORDER.includes(s))) return known.find((s) => !ORDER.includes(s)) ?? null;
  return known.reduce((a, b) => (ORDER.indexOf(a) <= ORDER.indexOf(b) ? a : b));
}

export interface Stage {
  id: string;
  name: string;
  /** 단계 하나의 상태. `docs`가 있으면 거기서 뒤처진 쪽을 쓴다. */
  state?: string | null;
  /** 한 칸에 묶인 문서들. 펼치면 따로 보인다. */
  docs?: { id: string; name: string; state?: string | null }[];
  /** 사람의 확정·승인을 기다리는 단계. */
  waiting?: boolean;
}

export interface StageProgressProps {
  steps?: Stage[];
  /** 지금 진행 중인 단계의 자리. */
  currentIndex?: number;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
  /** 펼친 단계. */
  expandedId?: string | null;
  onExpand?: (id: string | null) => void;
  emptyMessage?: string;
}

export function StageProgress({
  steps = [],
  currentIndex = -1,
  onSelect,
  selectedId = null,
  expandedId = null,
  onExpand,
  emptyMessage = "단계가 없습니다",
}: StageProgressProps) {
  if (steps.length === 0) {
    return <div className={styles.wrap}><p className={styles.empty}>{emptyMessage}</p></div>;
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.steps}>
        {steps.map((step, i) => {
          const state = step.docs?.length ? behind(step.docs.map((d) => d.state)) : step.state;
          const current = i === currentIndex;
          const selected = step.id === selectedId;
          const expanded = step.id === expandedId;
          const canExpand = (step.docs?.length ?? 0) > 1;

          return (
            <div key={step.id} className={styles.col}>
              <button
                type="button"
                className={`${styles.step} ${current ? styles.current : ""} ${selected ? styles.selected : ""}`}
                data-stage-id={step.id}
                onClick={() => {
                  onSelect?.(step.id);
                  if (canExpand) onExpand?.(expanded ? null : step.id);
                }}
              >
                <span className={styles.index}>{String(i + 1).padStart(2, "0")}</span>
                <span className={styles.name}>{step.name}</span>
                {state && <Badge label={state} tone={toneOf(state)} />}
                {step.waiting && (
                  <span className={styles.waiting}>
                    <img src={dot} alt="" width={6} height={6} />
                    사람 확인 대기
                  </span>
                )}
              </button>

              {/* 펼치면 묶인 문서마다 상태를 따로 보인다(POL-006). */}
              {canExpand && expanded && (
                <ul className={styles.docs}>
                  {step.docs!.map((d) => (
                    <li key={d.id} className={styles.doc}>
                      <span className={styles.docName}>{d.name}</span>
                      {d.state && <Badge label={d.state} tone={toneOf(d.state)} />}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
