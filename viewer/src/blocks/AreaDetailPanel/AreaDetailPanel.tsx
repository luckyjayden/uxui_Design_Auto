import { SectionHeader } from "../../base/SectionHeader/SectionHeader";
import styles from "./AreaDetailPanel.module.css";

/* BRQ-0012 영역 디스크립션·예외 패널
 *
 * 디자인   Figma 6sNGJRUgMlVSCDuym6e08z  node 5:358 (Block/AreaDetailPanel)
 * 쓰는 곳   SCR-005-A04
 *
 * 고른 영역의 디스크립션과 예외를 머리와 함께 늘어놓는다. 줄은 글머리다.
 *
 * props 셋이 **자리로 짝지어진다.** `sections[i]`의 머리가 `sectionLabels[i]`이고
 * 비었을 때 보일 말이 `emptyMessages[i]`다. 화면설계서 11절이 넘긴 '글자 그대로의
 * 배열'이 이 자리다. */

export interface AreaDetailPanelProps {
  /** 묶음마다의 줄 목록. */
  sections?: (string[] | null | undefined)[];
  /** 묶음 머리. `sections`와 자리로 짝짓는다. */
  sectionLabels?: string[];
  /** 묶음이 비었을 때 보일 말. `sections`와 자리로 짝짓는다. */
  emptyMessages?: string[];
}

export function AreaDetailPanel({
  sections = [],
  sectionLabels = [],
  emptyMessages = [],
}: AreaDetailPanelProps) {
  return (
    <div className={styles.panel}>
      {sections.map((lines, i) => {
        const items = lines ?? [];
        return (
          <section key={sectionLabels[i] ?? i} className={styles.section}>
            <SectionHeader label={sectionLabels[i] ?? `묶음 ${i + 1}`} count={items.length} />
            <div className={styles.items}>
              {items.length === 0 ? (
                <p className={styles.empty}>{emptyMessages[i] ?? "적힌 것이 없습니다"}</p>
              ) : (
                items.map((text, j) => (
                  <p key={j} className={styles.bullet}>
                    <span className={styles.dot} aria-hidden="true">
                      ·
                    </span>
                    <span className={styles.text}>{text}</span>
                  </p>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
