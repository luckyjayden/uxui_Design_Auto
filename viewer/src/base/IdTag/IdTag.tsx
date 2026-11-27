import styles from "./IdTag.module.css";

/* Base/IdTag — Figma node 1:170
 *
 * 산출물 ID를 보이는 태그다(REQ-001, POL-004, BLK-0001 …).
 * `broken`은 끊긴 참조 — 아직 만들어지지 않았거나 지워진 항목이다. */
export function IdTag({ label, broken = false }: { label: string; broken?: boolean }) {
  return (
    <span className={`${styles.tag} ${broken ? styles.broken : ""}`}>{label}</span>
  );
}
