import chevronRight from "../../assets/icons/chevron-right-16.svg";
import layers from "../../assets/icons/layers-20.svg";
import styles from "./ChangeNotice.module.css";

/* BRQ-0006 변경 영향 알림 줄
 *
 * 디자인   Figma 6sNGJRUgMlVSCDuym6e08z  node 7:782 (Block/ChangeNotice)
 * 쓰는 곳   SCR-002-A07 · SCR-006-A08
 *
 * `_meta/changes.json`에 승인된 항목의 변경이 있으면 보인다.
 *
 * **변경이 없으면 줄을 감추지 않는다.** '변경이 없습니다'로 흐리게 두고 누를 수
 * 없게 한다. 변경이 없다는 것도 기획자가 확인해야 할 사실이라 자리를 비우지 않는다.
 *
 * **판정은 만들지 않는다.** 뷰어가 '수정 필요'인지 '검토 필요'인지 매기지 않고
 * `changes.json`에 적힌 것을 그대로 보인다(POL-019).
 *
 * **BRQ-0005와 구현을 공유하지 않는다**(2026-11-26 확정). */

export interface ChangeNoticeProps {
  tone?: string;
  title?: string;
  description?: string;
  actionLabel?: string;
  /** 참이면 흐리게 두고 누를 수 없다. */
  disabled?: boolean;
  onAction?: () => void;
}

export function ChangeNotice({
  title,
  description,
  actionLabel,
  disabled = false,
  onAction,
}: ChangeNoticeProps) {
  // 변경이 없을 때의 말. 자리를 비우지 않는다.
  const shownTitle = disabled ? (title ?? "변경이 없습니다") : title;
  const shownDesc = disabled
    ? (description ?? "승인된 항목이 바뀐 기록이 없습니다.")
    : description;

  return (
    <div className={`${styles.notice} ${disabled ? styles.off : ""}`} data-disabled={disabled}>
      <img src={layers} alt="" width={20} height={20} />
      <span className={styles.text}>
        {shownTitle && <span className={styles.title}>{shownTitle}</span>}
        {shownDesc && <span className={styles.description}>{shownDesc}</span>}
      </span>
      {actionLabel && (
        <button
          type="button"
          className={styles.action}
          disabled={disabled}
          onClick={() => onAction?.()}
        >
          {actionLabel}
          <img src={chevronRight} alt="" width={16} height={16} />
        </button>
      )}
    </div>
  );
}
