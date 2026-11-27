import { Badge, toneOf } from "../Badge/Badge";
import { IdTag } from "../IdTag/IdTag";
import styles from "./ItemRow.module.css";

/* Base/ItemRow — Figma node 8:717
 *
 * 평면 목록의 한 줄이다. ID 배지 + 제목 + 본문 + 배지 + 메타.
 *
 * **순서는 파일에 적힌 그대로 두고 뷰어가 다시 정렬하지 않는다**(POL-009). */

export interface Item {
  id: string;
  title?: string;
  description?: string;
  /** `ai` · `human` · 그 밖. 그 밖이면 표시하지 않는다. */
  origin?: string | null;
  /** 통과·실패 둘뿐이다(POL-018). */
  verdict?: string | null;
  /** 실패 건수 같은 곁수치. */
  meta?: string;
}

/** 출처 값 → 배지 글. 그 밖의 값이면 표시하지 않는다(POL-009의 예외). */
const ORIGIN_LABEL: Record<string, string> = { ai: "AI 생성", human: "사람 수정" };

export function ItemRow({
  item,
  selected = false,
  onSelect,
  showOrigin = false,
  showVerdict = false,
}: {
  item: Item;
  selected?: boolean;
  onSelect?: () => void;
  showOrigin?: boolean;
  showVerdict?: boolean;
}) {
  const originLabel = item.origin ? ORIGIN_LABEL[item.origin] : undefined;

  const body = (
    <>
      <IdTag label={item.id} />
      <span className={styles.text}>
        {item.title && <span className={styles.title}>{item.title}</span>}
        {item.description && <span className={styles.description}>{item.description}</span>}
      </span>
      <span className={styles.side}>
        {showOrigin && originLabel && (
          <Badge label={originLabel} tone={item.origin === "ai" ? "info" : "neutral"} />
        )}
        {showVerdict && item.verdict && (
          <Badge label={item.verdict} tone={toneOf(item.verdict)} />
        )}
        {item.meta && <span className={styles.meta}>{item.meta}</span>}
      </span>
    </>
  );

  const cls = `${styles.row} ${selected ? styles.selected : ""}`;

  return onSelect ? (
    <button type="button" className={cls} data-item-id={item.id} onClick={onSelect}>
      {body}
    </button>
  ) : (
    <div className={cls} data-item-id={item.id}>
      {body}
    </div>
  );
}
