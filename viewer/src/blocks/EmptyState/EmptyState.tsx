import alertCircle from "../../assets/icons/alert-circle.svg";
import check from "../../assets/icons/check.svg";
import externalLink from "../../assets/icons/external-link-button.svg";
import fileText from "../../assets/icons/file-text.svg";
import inbox from "../../assets/icons/inbox.svg";
import layers from "../../assets/icons/layers.svg";
import styles from "./EmptyState.module.css";

/* BLK-0012 빈 상태 — standard 1.2.1
 *
 * 디자인   Figma 6sNGJRUgMlVSCDuym6e08z  node 1:311 (Block/EmptyState)
 * 쓰는 곳   SCR-001-A03 · SCR-003-A05 · SCR-004-A06 · SCR-005-A09 · SCR-006-A07 · SCR-007-A06
 * 버전 범위 ^1
 *
 * `illustration`은 그림을 고르는 이름이다. Figma 설명이 다섯을 짝지어 두었다.
 * 화면 파일이 '빈 다이어그램'도 쓰는데 Figma의 다섯에 없어 Layers로 받는다.
 * 아래 주석에 적어 두고 넘긴다. */

/** 그림 이름 → 아이콘. Figma 컴포넌트 설명의 짝이다. */
const ILLUSTRATION: Record<string, string> = {
  "첫 사용": inbox,
  "빈 문서": fileText,
  "빈 화면설계서": layers,
  "검증 전": alertCircle,
  "변경 없음": check,
  // Figma의 다섯에 없다. 화면 파일(SCR-004-A06)이 쓰므로 Layers로 받는다.
  "빈 다이어그램": layers,
};

export interface EmptyStateProps {
  /** 그림 이름. 모르는 이름이면 Inbox를 쓴다. */
  illustration?: string;
  title?: string;
  description?: string;
  /** 다음 행동의 글. 바깥으로 나가는 링크다. */
  action?: string;
  /** 그 링크의 주소. 없으면 버튼을 두지 않는다. */
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  illustration,
  title,
  description,
  action,
  actionHref,
  onAction,
}: EmptyStateProps) {
  const icon = (illustration && ILLUSTRATION[illustration]) || inbox;

  return (
    <div className={styles.empty}>
      <div className={styles.illustration}>
        <img src={icon} alt="" width={24} height={24} />
      </div>
      {title && <p className={styles.title}>{title}</p>}
      {description && <p className={styles.description}>{description}</p>}

      {action &&
        (actionHref ? (
          <a
            className={styles.action}
            href={actionHref}
            target="_blank"
            rel="noreferrer noopener"
          >
            {action}
            <img src={externalLink} alt="" width={16} height={16} />
          </a>
        ) : onAction ? (
          <button type="button" className={styles.action} onClick={onAction}>
            {action}
          </button>
        ) : (
          // 나갈 곳이 없으면 버튼을 두지 않는다. 누를 수 없는 버튼을 보이지 않는다.
          <p className={styles.noWhere}>연결할 곳이 없습니다</p>
        ))}
    </div>
  );
}
