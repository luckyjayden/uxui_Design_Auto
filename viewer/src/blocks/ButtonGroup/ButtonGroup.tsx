import externalLinkButton from "../../assets/icons/external-link-button.svg";
import externalLinkInverse from "../../assets/icons/external-link-inverse.svg";
import styles from "./ButtonGroup.module.css";

/* BLK-0003 버튼 그룹 — core 2.1.1
 *
 * 디자인   Figma 6sNGJRUgMlVSCDuym6e08z  node 1:293 (Block/ButtonGroup)
 * 쓰는 곳   SCR-001-A04 · SCR-003-A06 · SCR-004-A05 · SCR-005-A07 · SCR-007-A07
 * 버전 범위 ^2
 *
 * **바깥으로 나가는 링크다. 새 탭에서 연다.** 뷰어는 저장소에 쓰지 않으므로
 * 여기서 일어나는 일은 다른 곳으로 나가는 것뿐이다(POL-001, POL-034).
 *
 * 주소를 만들지 못하면 비활성으로 두고 까닭을 적는다. Figma 설명이 그 문구를
 * 셋으로 갈랐다 — '연결할 곳이 없습니다', '아직 만들어지지 않았습니다',
 * 'PR이 아직 열리지 않았습니다'. */

export interface ButtonGroupProps {
  /** 주 행동의 글. */
  primaryAction?: string;
  /** 보조 행동의 글. 없으면 주 행동 하나만 둔다(layout=Single). */
  secondaryAction?: string;
  /** 참이면 둘 다 비활성이고 아래에 까닭을 적는다. */
  disabled?: boolean;
  /** 주 행동이 나가는 주소. */
  primaryHref?: string;
  /** 보조 행동이 나가는 주소. */
  secondaryHref?: string;
  /** 비활성일 때 아래에 적을 까닭. */
  disabledMessage?: string;
}

export function ButtonGroup({
  primaryAction,
  secondaryAction,
  disabled = false,
  primaryHref,
  secondaryHref,
  disabledMessage = "연결할 곳이 없습니다",
}: ButtonGroupProps) {
  // 주소가 없으면 누를 곳이 없는 것이다. disabled가 거짓이어도 비활성이 된다.
  const noWhere = !primaryHref && !secondaryHref;
  const off = disabled || noWhere;

  return (
    <div className={styles.group}>
      <div className={styles.buttons}>
        {primaryAction &&
          (off ? (
            <span className={`${styles.button} ${styles.primary} ${styles.off}`} aria-disabled="true">
              {primaryAction}
              <img src={externalLinkButton} alt="" width={16} height={16} />
            </span>
          ) : (
            <a
              className={`${styles.button} ${styles.primary}`}
              href={primaryHref}
              target="_blank"
              rel="noreferrer noopener"
            >
              {primaryAction}
              <img src={externalLinkInverse} alt="" width={16} height={16} />
            </a>
          ))}

        {secondaryAction &&
          (off ? (
            <span className={`${styles.button} ${styles.secondary} ${styles.off}`} aria-disabled="true">
              {secondaryAction}
              <img src={externalLinkButton} alt="" width={16} height={16} />
            </span>
          ) : (
            <a
              className={`${styles.button} ${styles.secondary}`}
              href={secondaryHref ?? primaryHref}
              target="_blank"
              rel="noreferrer noopener"
            >
              {secondaryAction}
              <img src={externalLinkButton} alt="" width={16} height={16} />
            </a>
          ))}
      </div>

      {off && <p className={styles.reason}>{disabledMessage}</p>}
    </div>
  );
}
