import { MetricItem, type Metric } from "../../base/MetricItem/MetricItem";
import styles from "./MetricSummary.module.css";

/* BRQ-0002 요약 수치
 *
 * 디자인   Figma 6sNGJRUgMlVSCDuym6e08z  node 6:587 (Block/MetricSummary)
 * 쓰는 곳   SCR-002-A03 진행 · SCR-006-A02 검증 · SCR-007-A02 변경
 *
 * **저장소에서 센 값만 보인다.** 비율도 예상 완료일도 만들지 않는다.
 * 값이 없는 칸은 만들어 채우지 않고 건너뛴다(Figma 컴포넌트 설명). */

export interface MetricSummaryProps {
  metrics?: Metric[];
  /** 한 줄에 몇 칸을 둘지. 화면 파일은 3을 넘긴다. */
  columns?: number;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  emptyMessage?: string;
}

export function MetricSummary({
  metrics = [],
  columns = 3,
  selectedId = null,
  onSelect,
  emptyMessage = "셀 수 있는 것이 없습니다",
}: MetricSummaryProps) {
  // 값이 없는 칸은 지어내지 않는다.
  const shown = metrics.filter((m) => m.value !== null && m.value !== undefined);

  if (shown.length === 0) {
    return <div className={styles.row}><p className={styles.empty}>{emptyMessage}</p></div>;
  }

  return (
    <div
      className={styles.row}
      style={{ gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0, 1fr))` }}
    >
      {shown.map((m, i) => (
        <MetricItem
          key={m.id ?? m.label ?? i}
          metric={m}
          selected={(m.id ?? m.label) === selectedId}
          onSelect={onSelect ? () => onSelect(m.id ?? m.label) : undefined}
        />
      ))}
    </div>
  );
}
