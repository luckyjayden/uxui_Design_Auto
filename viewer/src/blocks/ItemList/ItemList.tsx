import { ItemRow, type Item } from "../../base/ItemRow/ItemRow";
import styles from "./ItemList.module.css";

/* BRQ-0007 문서 항목 목록 · BRQ-0014 판정 결과 목록
 *
 * 디자인   Figma 6sNGJRUgMlVSCDuym6e08z  node 8:801 (Block/ItemList)
 *
 * **컴포넌트 하나가 등록 요청 둘을 덮는다**(D-4: 구현은 공유, BRQ 번호 유지).
 *
 *   BRQ-0007  SCR-003-A03 문서 항목 · SCR-007-A03 변경 목록
 *             showOrigin — ai는 'AI 생성', human은 '사람 수정', 그 밖은 표시 없음
 *   BRQ-0014  SCR-006-A03 규칙별 판정
 *             showVerdict — 통과·실패 둘뿐(POL-018)
 *
 * **순서는 파일에 적힌 그대로 두고 다시 정렬하지 않는다**(POL-009).
 * 누르면 화면을 옮기지 않고 옆 패널만 바뀐다. */

export interface ItemListProps {
  items?: Item[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  showOrigin?: boolean;
  showVerdict?: boolean;
  emptyMessage?: string;
}

export function ItemList({
  items = [],
  selectedId = null,
  onSelect,
  showOrigin = false,
  showVerdict = false,
  emptyMessage = "항목이 없습니다",
}: ItemListProps) {
  if (items.length === 0) {
    return <div className={styles.list}><p className={styles.empty}>{emptyMessage}</p></div>;
  }

  return (
    <div className={styles.list}>
      {items.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          selected={item.id === selectedId}
          onSelect={onSelect ? () => onSelect(item.id) : undefined}
          showOrigin={showOrigin}
          showVerdict={showVerdict}
        />
      ))}
    </div>
  );
}
