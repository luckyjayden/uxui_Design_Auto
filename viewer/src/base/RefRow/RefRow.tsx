import chevronRight from "../../assets/icons/chevron-right.svg";
import externalLink from "../../assets/icons/external-link.svg";
import { Badge, toneOf } from "../Badge/Badge";
import { IdTag } from "../IdTag/IdTag";
import styles from "./RefRow.module.css";

/* Base/RefRow — Figma node 1:212
 *
 * 참조 목록의 한 줄이다. 항목 참조 패널(BRQ-0008)·블록 참조 목록(BRQ-0013)·
 * 고칠 곳 목록(BRQ-0015) 셋이 공유한다.
 *
 *   ID 태그 + 제목(+보조 문구) + 배지 + 메타 + 바깥 링크 + 화살표
 *
 * **끊긴 참조는 이동하지 않는다.** 화살표를 두지 않고 누를 수도 없다.
 * 뷰어가 이동할 곳을 만들어 내지 않는다(POL-011). */

export interface Ref {
  id: string;
  title?: string;
  /** 제목 아래 작은 글. 끊긴 참조의 까닭 같은 것. */
  sub?: string;
  /** 끊긴 참조. 누를 수 없다. */
  broken?: boolean;
  /** 배지에 보일 상태. `showBadge`가 참일 때만 보인다. */
  state?: string | null;
  /** 메타. 버전 범위(`^2`) 같은 것. `showMeta`가 참일 때만. */
  meta?: string;
  /** 바깥으로 나가는 주소 둘. `showLinks`가 참일 때만. */
  repoHref?: string;
  sessionHref?: string;
}

export interface RefRowProps {
  item: Ref;
  selected?: boolean;
  onSelect?: () => void;
  showBadge?: boolean;
  showMeta?: boolean;
  showLinks?: boolean;
  onOpenRepo?: (id: string) => void;
  onOpenSession?: (id: string) => void;
}

export function RefRow({
  item,
  selected = false,
  onSelect,
  showBadge = false,
  showMeta = false,
  showLinks = false,
  onOpenRepo,
  onOpenSession,
}: RefRowProps) {
  const clickable = !item.broken && Boolean(onSelect);

  const body = (
    <>
      <IdTag label={item.id} broken={item.broken} />
      <span className={styles.text}>
        <span className={`${styles.title} ${item.broken ? styles.titleBroken : ""}`}>
          {item.title ?? (item.broken ? "(삭제된 항목)" : item.id)}
        </span>
        {item.sub && (
          <span className={`${styles.sub} ${item.broken ? styles.subBroken : ""}`}>
            {item.sub}
          </span>
        )}
      </span>
      {showBadge && item.state && <Badge label={item.state} tone={toneOf(item.state)} />}
      {showMeta && item.meta && <span className={styles.meta}>{item.meta}</span>}
      {showLinks && (
        <span className={styles.links}>
          <a
            className={styles.link}
            href={item.repoHref}
            target="_blank"
            rel="noreferrer noopener"
            onClick={(e) => {
              if (!item.repoHref) e.preventDefault();
              onOpenRepo?.(item.id);
            }}
          >
            GitHub
            <img src={externalLink} alt="" width={14} height={14} />
          </a>
          <a
            className={styles.link}
            href={item.sessionHref}
            target="_blank"
            rel="noreferrer noopener"
            onClick={(e) => {
              if (!item.sessionHref) e.preventDefault();
              onOpenSession?.(item.id);
            }}
          >
            세션
            <img src={externalLink} alt="" width={14} height={14} />
          </a>
        </span>
      )}
      {/* 끊긴 참조에는 화살표를 두지 않는다. 갈 곳이 없다. */}
      {!item.broken && <img className={styles.chevron} src={chevronRight} alt="" width={16} height={16} />}
    </>
  );

  const cls = `${styles.row} ${selected ? styles.selected : ""} ${item.broken ? styles.brokenRow : ""}`;

  if (!clickable) {
    return (
      <div className={cls} data-ref-id={item.id} data-broken={item.broken ? "true" : "false"}>
        {body}
      </div>
    );
  }

  return (
    <button type="button" className={cls} data-ref-id={item.id} data-broken="false" onClick={onSelect}>
      {body}
    </button>
  );
}
