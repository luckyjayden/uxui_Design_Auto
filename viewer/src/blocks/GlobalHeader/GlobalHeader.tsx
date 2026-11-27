import { useState } from "react";
import alertCircle from "../../assets/icons/alert-circle.svg";
import chevronLeft from "../../assets/icons/chevron-left.svg";
import clock from "../../assets/icons/clock.svg";
import externalLink from "../../assets/icons/external-link.svg";
import refreshIcon from "../../assets/icons/refresh.svg";
import searchIcon from "../../assets/icons/search.svg";
import styles from "./GlobalHeader.module.css";

/* BLK-0001 글로벌 헤더 — core 2.2.0
 *
 * 디자인   Figma 6sNGJRUgMlVSCDuym6e08z  node 1:242 (Block/GlobalHeader)
 * 레지스트리 reference/uxui-registry-mock/blocks/core/common/global-header.json (2.1.0)
 * 쓰는 곳   SCR-001-A01 ~ SCR-007-A01 (일곱 화면 전부)
 * 버전 범위 ^2
 *
 * 2.2.0은 BRQ-0016이 더한 판이다. `readAt`과 `onRefresh` 둘을 넓혔고 Minor라
 * 화면이 적어 둔 `^2` 안에 들어온다. Figma의 컴포넌트 설명도 2.2.0으로 적혀 있다.
 *
 * props 이름은 레지스트리의 code connect를 그대로 쓴다(POL-026).
 *   로고 → logo   뒤로가기 → showBack   타이틀 → title
 *   우측 액션 → actions   검색 → showSearch
 *
 * 디자인의 readState 세 가지가 아래 셋에 대응한다.
 *   Read    읽은 시점을 보인다
 *   Never   '읽은 시점 없음'. 시각을 지어내지 않고 새로고침은 그대로 눌린다
 *   Failed  '다시 읽지 못했습니다'. 앞서 읽은 값과 시점을 그대로 둔다
 */

export interface GlobalHeaderProps {
  /** 로고 자리에 보일 글. */
  logo?: string;
  /** 화면 이름. 로고 오른쪽에 구분선을 두고 놓인다. */
  title?: string;
  /** 뒤로가기를 둘지. 뷰어의 입구(SCR-001)에서는 거짓이다. */
  showBack?: boolean;
  /** 검색을 둘지. SCR-001에서만 참이다. */
  showSearch?: boolean;
  /** 우측 액션의 글. 바깥으로 나가는 링크다. */
  actions?: string;
  /** 바깥으로 나가는 주소. 없으면 '연결할 곳이 없습니다'를 보이고 비활성으로 둔다. */
  actionsHref?: string;
  /** 저장소를 읽은 시점. 비어 있으면 '읽은 시점 없음'을 보인다. (BRQ-0016) */
  readAt?: string | null;
  /** 새로고침. 누르면 다시 읽고 읽은 시점을 지금으로 바꾼다. (BRQ-0016) */
  onRefresh?: (readAt: string) => void;
  /** 뒤로가기를 눌렀을 때. */
  onBack?: () => void;
  /**
   * 검색어가 바뀌었을 때. **설계에 없는 prop이다(제안).**
   * SCR-001-A01의 인터랙션이 `set: "keyword"`라 헤더가 검색어를 내보내야 하는데
   * props 목록에 그 자리가 없다. viewer/README.md에 적고 넘긴다.
   */
  onSearch?: (keyword: string) => void;
}

/** 읽은 시점을 디자인의 꼴로. `11.27 15:20 읽음` */
function formatReadAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())} 읽음`;
}

export function GlobalHeader({
  logo = "UX AI Studio",
  title,
  showBack = false,
  showSearch = false,
  actions,
  actionsHref,
  readAt,
  onRefresh,
  onBack,
  onSearch,
}: GlobalHeaderProps) {
  const [failed, setFailed] = useState(false);
  const shown = formatReadAt(readAt);

  function refresh() {
    try {
      onRefresh?.(new Date().toISOString());
      setFailed(false);
    } catch {
      // 실패하면 앞서 읽은 값과 읽은 시점을 그대로 두고 알리기만 한다(예외 5번).
      setFailed(true);
    }
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {showBack && (
          <button
            type="button"
            className={styles.iconButton}
            onClick={onBack}
            aria-label="뒤로가기"
          >
            <img src={chevronLeft} alt="" width={16} height={16} />
          </button>
        )}
        {logo && <span className={styles.logo}>{logo}</span>}
        {logo && title && <span className={styles.divider} aria-hidden="true" />}
        {/* 디자인에서 이 자리는 label/m 글이지 문서 제목이 아니다. h1로 두면
            와이어프레임이 다른 화면의 헤더를 그릴 때 h1이 겹친다. */}
        {title && <span className={styles.title}>{title}</span>}
      </div>

      <div className={styles.right}>
        {showSearch && (
          <div className={styles.searchField}>
            <img src={searchIcon} alt="" width={16} height={16} />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="프로젝트 이름 검색"
              aria-label="검색"
              onChange={(e) => onSearch?.(e.target.value)}
            />
          </div>
        )}

        <span className={styles.readAt}>
          <img src={clock} alt="" width={14} height={14} />
          {/* 비어 있으면 시각을 지어내지 않는다(예외 4번). */}
          <span className={styles.readAtText}>{shown ?? "읽은 시점 없음"}</span>
          {failed && (
            <span className={styles.failed}>
              <img src={alertCircle} alt="" width={14} height={14} />
              다시 읽지 못했습니다
            </span>
          )}
        </span>

        <button
          type="button"
          className={styles.iconButton}
          onClick={refresh}
          aria-label="새로고침"
        >
          <img src={refreshIcon} alt="" width={16} height={16} />
        </button>

        {actions &&
          (actionsHref ? (
            <a
              className={styles.action}
              href={actionsHref}
              target="_blank"
              rel="noreferrer noopener"
            >
              {actions}
              <img src={externalLink} alt="" width={14} height={14} />
            </a>
          ) : (
            // 주소를 만들지 못하면 비활성으로 두고 안내를 보인다(예외 3번).
            <span className={styles.actionDisabled} aria-disabled="true">
              연결할 곳이 없습니다
            </span>
          ))}
      </div>
    </header>
  );
}
