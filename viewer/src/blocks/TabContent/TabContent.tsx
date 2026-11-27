import { Badge, toneOf } from "../../base/Badge/Badge";
import styles from "./TabContent.module.css";

/* BLK-0020 탭 콘텐츠 — standard 2.1.0
 *
 * 디자인   Figma 6sNGJRUgMlVSCDuym6e08z  node 1:286 (Block/TabContent)
 * 쓰는 곳   SCR-003-A02 문서 고르개 · SCR-004-A02 플로우 고르개 · SCR-005-A02 화면 고르개
 * 버전 범위 ^2
 *
 * props 이름은 2026-11-27에 확정했다(D-3). 레지스트리가 `connected: false`라
 * 비어 있던 자리이며, 화면설계서가 제안한 것을 그대로 받았다.
 *
 *   tabs · activeTabId · onTabChange
 *
 * 탭마다 상태 배지가 붙는다. 아직 만들어지지 않은 문서는 누를 수 없고
 * '비어 있음'을 보인다(Figma 컴포넌트 설명). */

export interface Tab {
  id: string;
  /** 탭에 보일 이름. */
  label: string;
  /** 문서·단계 상태. 다섯 값 밖이면 '알 수 없음' 배지가 된다(POL-005). */
  state?: string | null;
  /** 아직 만들어지지 않아 누를 수 없는 탭. */
  disabled?: boolean;
}

export interface TabContentProps {
  /** 탭 목록. */
  tabs?: Tab[];
  /** 지금 고른 탭. */
  activeTabId?: string | null;
  onTabChange?: (tabId: string) => void;
  /** 탭이 하나도 없을 때 보일 말. */
  emptyMessage?: string;
}

export function TabContent({
  tabs = [],
  activeTabId = null,
  onTabChange,
  emptyMessage = "볼 수 있는 것이 없습니다",
}: TabContentProps) {
  if (tabs.length === 0) {
    return <div className={styles.bar}><span className={styles.empty}>{emptyMessage}</span></div>;
  }

  return (
    <div className={styles.bar} role="tablist">
      {tabs.map((tab) => {
        const active = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={tab.disabled}
            className={`${styles.tab} ${active ? styles.active : ""}`}
            onClick={() => onTabChange?.(tab.id)}
          >
            <span className={styles.label}>{tab.label}</span>
            {tab.disabled ? (
              <Badge label="비어 있음" tone="neutral" />
            ) : (
              tab.state && <Badge label={tab.state} tone={toneOf(tab.state)} />
            )}
          </button>
        );
      })}
    </div>
  );
}
