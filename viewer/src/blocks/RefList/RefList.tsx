import { RefRow, type Ref } from "../../base/RefRow/RefRow";
import { SectionHeader } from "../../base/SectionHeader/SectionHeader";
import styles from "./RefList.module.css";

/* BRQ-0008 항목 참조 패널 · BRQ-0013 블록 참조 목록 · BRQ-0015 고칠 곳 목록
 *
 * 디자인   Figma 6sNGJRUgMlVSCDuym6e08z  node 4:361 (Block/RefList)
 *
 * **컴포넌트 하나가 등록 요청 셋을 덮는다.** 2026-11-27 D-4의 결정이다 —
 * 구현은 공유하되 BRQ 번호는 그대로 둔다. 화면 파일의 `block.id`와 설계
 * 근거 표는 한 줄도 바뀌지 않았다.
 *
 *   BRQ-0008  SCR-003-A04 · SCR-004-A04 · SCR-005-A05 · SCR-006-A05 · SCR-007-A04
 *             props  groups, onSelect, emptyMessage
 *   BRQ-0013  SCR-005-A06 · SCR-006-A06
 *             props  + showBlockStatus(배지), showVersionRange(메타 ^Major)
 *   BRQ-0015  SCR-007-A05
 *             props  groups, onOpenRepo, onOpenSession, showVerdict, emptyMessage
 *
 * 끊긴 참조는 Broken으로 보이고 이동하지 않는다(POL-011). 뷰어는 이동할 곳을
 * 만들어 내지 않는다. 고칠 곳 목록의 두 묶음은 겹쳐도 합치지 않는다. */

export interface RefGroup {
  /** 묶음 머리에 보일 이름. */
  label?: string;
  items?: Ref[];
}

export interface RefListProps {
  /**
   * 묶음 여럿. 화면 파일은 state 키의 배열로 넘기고 렌더러가 값으로 푼다.
   * 값이 배열이면 이름 없는 묶음으로 본다.
   */
  groups?: (RefGroup | Ref[])[];
  onSelect?: (id: string) => void;
  selectedId?: string | null;
  emptyMessage?: string;
  /** BRQ-0013. 줄마다 상태 배지를 보인다. */
  showBlockStatus?: boolean;
  /** BRQ-0013. 줄마다 버전 범위를 보인다. */
  showVersionRange?: boolean;
  /** BRQ-0015. 줄마다 판정을 보인다. 배지와 같은 자리다. */
  showVerdict?: boolean;
  /** BRQ-0015. 줄마다 바깥 링크 둘을 단다. */
  onOpenRepo?: (id: string) => void;
  onOpenSession?: (id: string) => void;
}

function normalize(g: RefGroup | Ref[]): RefGroup {
  return Array.isArray(g) ? { items: g } : g;
}

export function RefList({
  groups = [],
  onSelect,
  selectedId = null,
  emptyMessage = "연결된 항목이 없습니다",
  showBlockStatus = false,
  showVersionRange = false,
  showVerdict = false,
  onOpenRepo,
  onOpenSession,
}: RefListProps) {
  const normalized = groups.map(normalize).filter((g) => (g.items?.length ?? 0) > 0);

  if (normalized.length === 0) {
    return (
      <div className={styles.panel}>
        <p className={styles.empty}>{emptyMessage}</p>
      </div>
    );
  }

  const showLinks = Boolean(onOpenRepo || onOpenSession);

  return (
    <div className={styles.panel}>
      {normalized.map((group, i) => (
        <div key={group.label ?? i} className={styles.group}>
          {group.label && <SectionHeader label={group.label} count={group.items?.length} />}
          {group.items?.map((item) => (
            <RefRow
              key={item.id}
              item={item}
              selected={item.id === selectedId}
              onSelect={onSelect ? () => onSelect(item.id) : undefined}
              showBadge={showBlockStatus || showVerdict}
              showMeta={showVersionRange}
              showLinks={showLinks}
              onOpenRepo={onOpenRepo}
              onOpenSession={onOpenSession}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
