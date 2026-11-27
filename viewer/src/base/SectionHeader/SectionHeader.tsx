import styles from "./SectionHeader.module.css";

/* Base/SectionHeader — Figma node 1:175. 묶음 이름과 개수. */
export function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <div className={styles.head}>
      <span className={styles.label}>{label}</span>
      {count !== undefined && <span className={styles.count}>{count}</span>}
    </div>
  );
}
