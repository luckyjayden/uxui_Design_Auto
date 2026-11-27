import { useMemo } from "react";
import { Badge } from "../../base/Badge/Badge";
import { FlowNode, type FlowNodeData } from "../../base/FlowNode/FlowNode";
import { IdTag } from "../../base/IdTag/IdTag";
import styles from "./FlowDiagram.module.css";

/* BRQ-0009 플로우 다이어그램
 *
 * 디자인   Figma 6sNGJRUgMlVSCDuym6e08z  node 9:849 (Block/FlowDiagram)
 * 쓰는 곳   SCR-004-A03
 *
 * **플로우 JSON 그대로 그린다.** 단계를 더하거나 빼거나 이어 붙이지 않는다.
 * 분기에서 나가는 선마다 조건과 정책 ID를 보이고, **정책이 없는 분기는
 * '정책 없음'과 빨간 점선으로 구분한다**(QA-03의 그 검사다).
 *
 * 배치는 **깊이에 따른 층 배치**를 직접 계산한다. DEV 4절이 React Flow를
 * 제안했지만 그것은 확정이 아니고(기술 스택 표의 '제안'), 의존성을 늘리기
 * 전에 사람이 정할 일이다. 지금 유저 플로우는 단계 42·연결 56·분기 9이고
 * 이 배치로 읽힌다. viewer/README.md에 적고 넘긴다. */

const NODE_W = 180;
const COL_GAP = 80;
const ROW_GAP = 24;
const NODE_H = 68;

export interface FlowEdge {
  from: string;
  to: string;
  condition?: string;
  /** 분기에서 나가는 선의 근거 정책. 없으면 '정책 없음'이다. */
  policy?: string | null;
}

export interface FlowDiagramProps {
  nodes?: FlowNodeData[];
  edges?: FlowEdge[];
  selectedNodeId?: string | null;
  onSelectNode?: (id: string) => void;
  /** 분기에서 나가는 선에 조건과 정책을 보일지. */
  showBranchCondition?: boolean;
  emptyMessage?: string;
}

/** 들어오는 선이 없는 노드에서 시작해 깊이를 센다. 순환이 있어도 멈춘다. */
function layout(nodes: FlowNodeData[], edges: FlowEdge[]) {
  const depth = new Map<string, number>();
  const incoming = new Map<string, number>();
  for (const n of nodes) incoming.set(n.id, 0);
  for (const e of edges) incoming.set(e.to, (incoming.get(e.to) ?? 0) + 1);

  const queue = nodes.filter((n) => (incoming.get(n.id) ?? 0) === 0).map((n) => n.id);
  // 들어오는 선이 없는 노드가 하나도 없으면(모두 순환) 첫 노드에서 시작한다.
  if (queue.length === 0 && nodes.length > 0) queue.push(nodes[0].id);
  for (const id of queue) depth.set(id, 0);

  const out = new Map<string, string[]>();
  for (const e of edges) out.set(e.from, [...(out.get(e.from) ?? []), e.to]);

  let guard = nodes.length * edges.length + nodes.length + 1;
  while (queue.length > 0 && guard-- > 0) {
    const id = queue.shift()!;
    const d = depth.get(id) ?? 0;
    for (const next of out.get(id) ?? []) {
      if (!depth.has(next) || (depth.get(next) ?? 0) < d + 1) {
        depth.set(next, d + 1);
        queue.push(next);
      }
    }
  }
  // 닿지 못한 노드는 맨 끝 열에 둔다. 빼지 않는다.
  const maxDepth = Math.max(0, ...[...depth.values()]);
  for (const n of nodes) if (!depth.has(n.id)) depth.set(n.id, maxDepth + 1);

  const columns = new Map<number, string[]>();
  for (const n of nodes) {
    const d = depth.get(n.id)!;
    columns.set(d, [...(columns.get(d) ?? []), n.id]);
  }

  const pos = new Map<string, { x: number; y: number }>();
  for (const [d, ids] of columns) {
    ids.forEach((id, i) => {
      pos.set(id, { x: d * (NODE_W + COL_GAP), y: i * (NODE_H + ROW_GAP) });
    });
  }
  const width = (Math.max(0, ...[...columns.keys()]) + 1) * (NODE_W + COL_GAP);
  const height = Math.max(...[...columns.values()].map((v) => v.length), 1) * (NODE_H + ROW_GAP);
  return { pos, width, height };
}

export function FlowDiagram({
  nodes = [],
  edges = [],
  selectedNodeId = null,
  onSelectNode,
  showBranchCondition = false,
  emptyMessage = "비어 있음",
}: FlowDiagramProps) {
  const { pos, width, height } = useMemo(() => layout(nodes, edges), [nodes, edges]);

  if (nodes.length === 0) {
    return <div className={styles.canvas}><p className={styles.empty}>{emptyMessage}</p></div>;
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className={styles.canvas}>
      <div className={styles.inner} style={{ width, height: height + 40 }}>
        <svg className={styles.edges} width={width} height={height + 40} aria-hidden="true">
          {edges.map((e, i) => {
            const a = pos.get(e.from);
            const b = pos.get(e.to);
            if (!a || !b) return null;
            const x1 = a.x + NODE_W;
            const y1 = a.y + NODE_H / 2;
            const x2 = b.x;
            const y2 = b.y + NODE_H / 2;
            const mid = (x1 + x2) / 2;
            // 분기에서 나가는데 정책이 없으면 빨간 점선으로 구분한다(QA-03).
            const broken = byId.get(e.from)?.type === "분기" && !e.policy;
            return (
              <path
                key={i}
                d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
                className={broken ? styles.edgeBroken : styles.edge}
              />
            );
          })}
        </svg>

        {nodes.map((n) => {
          const p = pos.get(n.id)!;
          return (
            <div key={n.id} className={styles.node} style={{ left: p.x, top: p.y }}>
              <FlowNode
                node={n}
                selected={n.id === selectedNodeId}
                onSelect={onSelectNode ? () => onSelectNode(n.id) : undefined}
              />
            </div>
          );
        })}

        {showBranchCondition &&
          edges.map((e, i) => {
            const a = pos.get(e.from);
            const b = pos.get(e.to);
            if (!a || !b) return null;
            if (byId.get(e.from)?.type !== "분기") return null;
            const x = (a.x + NODE_W + b.x) / 2;
            const y = (a.y + b.y) / 2 + NODE_H / 2;
            return (
              <span key={`c${i}`} className={styles.condition} style={{ left: x, top: y }}>
                {e.condition && <span className={styles.conditionText}>{e.condition}</span>}
                {e.policy ? (
                  <IdTag label={e.policy} />
                ) : (
                  <Badge label="정책 없음" tone="danger" />
                )}
              </span>
            );
          })}
      </div>
    </div>
  );
}
