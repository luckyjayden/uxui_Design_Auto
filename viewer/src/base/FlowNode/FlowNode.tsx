import { IdTag } from "../IdTag/IdTag";
import styles from "./FlowNode.module.css";

/* Base/FlowNode — Figma node 9:793
 *
 * 플로우 단계 하나. **유형은 색만이 아니라 글자로도 적는다**(Figma 설명). */

export type StepType = "진입" | "선택" | "분기" | "완료" | "이탈";

export interface FlowNodeData {
  id: string;
  title?: string;
  type?: StepType | string;
}

const CLASS: Record<string, string> = {
  "진입": "entry",
  "선택": "choice",
  "분기": "branch",
  "완료": "end",
  "이탈": "exit",
};

export function FlowNode({
  node,
  selected = false,
  onSelect,
}: {
  node: FlowNodeData;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const kind = CLASS[node.type ?? ""] ?? "choice";
  const cls = `${styles.node} ${styles[kind]} ${selected ? styles.selected : ""}`;

  const body = (
    <>
      <span className={styles.head}>
        <IdTag label={node.id} />
        <span className={styles.type}>{node.type}</span>
      </span>
      {node.title && <span className={styles.title}>{node.title}</span>}
    </>
  );

  return onSelect ? (
    <button type="button" className={cls} data-node-id={node.id} data-type={node.type} onClick={onSelect}>
      {body}
    </button>
  ) : (
    <div className={cls} data-node-id={node.id} data-type={node.type}>
      {body}
    </div>
  );
}
