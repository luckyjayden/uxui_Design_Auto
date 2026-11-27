import chevronRight from "../../assets/icons/chevron-right-16.svg";
import clock from "../../assets/icons/clock-20.svg";
import externalLink from "../../assets/icons/external-link.svg";
import styles from "./WaitingNotice.module.css";

/* BRQ-0005 대기 알림 줄
 *
 * 디자인   Figma 6sNGJRUgMlVSCDuym6e08z  node 7:744 (Block/WaitingNotice)
 * 쓰는 곳   SCR-002-A02 하나
 *
 * 확정·승인·선택 대기를 한 줄로 먼저 보인다. **기다리는 일이 없으면 줄 자체를
 * 보이지 않는다.** 여럿이면 앞선 단계의 것 하나를 머리로 두고 나머지는 펼쳐 본다.
 *
 * **뷰어 안에 승인·실행 버튼을 두지 않는다**(POL-002). 바깥으로 나가는 링크만 둔다.
 *
 * **BRQ-0006과 구현을 공유하지 않는다.** 2026-11-26에 사람이 묶지 않기로
 * 확정했고 Figma의 컴포넌트 설명도 그렇게 적고 있다. */

export interface Waiting {
  id?: string;
  title: string;
  /** 바깥으로 나가는 글과 주소. */
  actionLabel?: string;
  actionHref?: string;
}

export interface WaitingNoticeProps {
  tone?: string;
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  /** 머리 말고 더 기다리는 일들. 펼쳐 본다. */
  others?: Waiting[];
  expandable?: boolean;
  expanded?: boolean;
  onExpand?: (next: boolean) => void;
}

export function WaitingNotice({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  others = [],
  expandable = false,
  expanded = false,
  onExpand,
}: WaitingNoticeProps) {
  // 기다리는 일이 없으면 줄 자체를 보이지 않는다.
  if (!title) return null;

  const canExpand = expandable && others.length > 0;

  return (
    <div className={styles.notice}>
      <div className={styles.head}>
        <img src={clock} alt="" width={20} height={20} />
        <span className={styles.text}>
          <span className={styles.title}>{title}</span>
          {description && <span className={styles.description}>{description}</span>}
        </span>

        {canExpand && (
          <button
            type="button"
            className={styles.expand}
            aria-expanded={expanded}
            onClick={() => onExpand?.(!expanded)}
          >
            {expanded ? "접기" : `${others.length}건 더`}
            <img
              className={expanded ? styles.chevronUp : styles.chevronDown}
              src={chevronRight}
              alt=""
              width={16}
              height={16}
            />
          </button>
        )}

        {actionLabel && <ExternalAction label={actionLabel} href={actionHref} onAction={onAction} />}
      </div>

      {canExpand && expanded && (
        <ul className={styles.others}>
          {others.map((o, i) => (
            <li key={o.id ?? i} className={styles.other}>
              <span className={styles.otherTitle}>{o.title}</span>
              {o.actionLabel && <ExternalAction label={o.actionLabel} href={o.actionHref} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* 바깥으로 나가는 링크. 주소를 만들지 못하면 비활성으로 두고 안내를 보인다. */
function ExternalAction({
  label,
  href,
  onAction,
}: {
  label: string;
  href?: string;
  onAction?: () => void;
}) {
  if (!href) {
    return <span className={styles.linkOff}>연결할 곳이 없습니다</span>;
  }
  return (
    <a
      className={styles.link}
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      onClick={() => onAction?.()}
    >
      {label}
      <img src={externalLink} alt="" width={14} height={14} />
    </a>
  );
}
