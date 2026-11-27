import { useState } from "react";
import styles from "./GlobalHeader.module.css";

/* BLK-0001 글로벌 헤더 — core 2.1.0 (+ BRQ-0016으로 2.2.0 제안)
 *
 * 레지스트리  reference/uxui-registry-mock/blocks/core/common/global-header.json
 * 쓰는 곳     SCR-001-A01 ~ SCR-007-A01 (일곱 화면 전부)
 * 버전 범위   ^2
 *
 * props 이름은 레지스트리의 code connect를 그대로 쓴다(POL-026).
 *
 *   로고 → logo   뒤로가기 → showBack   타이틀 → title
 *   우측 액션 → actions   검색 → showSearch
 *
 * readAt·onRefresh 둘은 BRQ-0016으로 더한 자리다. POL-004가 "화면은 저장소를
 * 읽은 시점을 함께 보이고 다시 읽기는 새로고침으로 한다"고 정했고, 헤더 한
 * 자리를 넓혀 일곱 장이 모두 받도록 했다. Minor 확장이라 참조 범위 ^2 안이고
 * 영역의 block.id는 BLK-0001 그대로다. */

export interface GlobalHeaderProps {
  /** 로고 자리에 보일 글. 레지스트리의 INSTANCE_SWAP을 글로 받는다. */
  logo?: string;
  /** 화면 이름. */
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

/** 읽은 시점을 사람이 읽는 꼴로. 날짜만이 아니라 시각까지 보인다(디스크립션 3번). */
function formatReadAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function GlobalHeader({
  logo,
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
      // 실패하면 앞서 읽은 값과 읽은 시점을 그대로 두고 알리기만 한다.
      // 화면의 값을 비우지 않는다(예외 5번).
      setFailed(true);
    }
  }

  return (
    <header className={styles.header}>
      {showBack && (
        <button type="button" className={styles.back} onClick={onBack} aria-label="뒤로가기">
          ←
        </button>
      )}

      {logo && <span className={styles.logo}>{logo}</span>}
      {title && <h1 className={styles.title}>{title}</h1>}

      {showSearch && (
        <input
          type="search"
          className={styles.search}
          placeholder="이름으로 거르기"
          aria-label="검색"
          onChange={(e) => onSearch?.(e.target.value)}
        />
      )}

      <div className={styles.right}>
        {/* 읽은 시점. 비어 있으면 시각을 지어내지 않는다(예외 4번). */}
        <span className={styles.readAt}>
          {shown ? `읽은 시점 ${shown}` : "읽은 시점 없음"}
        </span>

        <button type="button" className={styles.refresh} onClick={refresh}>
          새로고침
        </button>

        {failed && <span className={styles.failed}>다시 읽지 못했습니다</span>}

        {actions &&
          (actionsHref ? (
            <a
              className={styles.action}
              href={actionsHref}
              target="_blank"
              rel="noreferrer noopener"
            >
              {actions}
            </a>
          ) : (
            // 링크 주소를 만들지 못하면 비활성으로 둔다(예외 3번).
            <span className={styles.actionDisabled} aria-disabled="true">
              연결할 곳이 없습니다
            </span>
          ))}
      </div>
    </header>
  );
}
