import styles from "./MetricItem.module.css";

/* Base/MetricItem — Figma node 6:460
 *
 * 수치 하나. **저장소에서 센 값만 보인다.** 비율도 예상치도 만들지 않는다
 * (Figma 컴포넌트 설명). 값이 없으면 칸을 만들어 채우지 않는다. */
export interface Metric {
  id?: string;
  label: string;
  /** 센 값. 없으면 이 칸을 그리지 않는다. */
  value?: number | string | null;
  sub?: string;
}

export function MetricItem({
  metric,
  selected = false,
  onSelect,
}: {
  metric: Metric;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const body = (
    <>
      <span className={styles.label}>{metric.label}</span>
      <span className={styles.value}>{metric.value}</span>
      {metric.sub && <span className={styles.sub}>{metric.sub}</span>}
    </>
  );

  const cls = `${styles.item} ${selected ? styles.selected : ""}`;

  return onSelect ? (
    <button type="button" className={cls} onClick={onSelect} data-metric={metric.label}>
      {body}
    </button>
  ) : (
    <div className={cls} data-metric={metric.label}>
      {body}
    </div>
  );
}
