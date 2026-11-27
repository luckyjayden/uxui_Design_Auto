import { Badge, toneOf } from "../Badge/Badge";
import styles from "./ProjectCard.module.css";

/* Base/ProjectCard — Figma node 6:451
 *
 * 값은 모두 `_meta/status.json`에서 읽은 것이다. 뷰어가 만들어 내지 않는다.
 * 일곱 단계 막대는 단계마다 한 칸이고 상태에 따라 색이 다르다. */

export interface Project {
  id: string;
  name?: string;
  /** 진행 상태. POL-005의 다섯 값. */
  state?: string | null;
  /** 일곱 단계의 상태. 막대 한 칸씩이 된다. */
  stages?: (string | null)[];
  currentStage?: string;
  doneCount?: string;
  updatedAt?: string;
}

/** 단계 상태 → 막대 칸의 모양. */
function barClass(state: string | null | undefined): string {
  const tone = toneOf(state);
  if (tone === "success") return styles.done;
  if (tone === "warning" || tone === "info") return styles.current;
  return styles.todo;
}

export function ProjectCard({
  project,
  selected = false,
  onSelect,
}: {
  project: Project;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const stages = project.stages ?? [];

  const body = (
    <>
      <span className={styles.head}>
        <span className={styles.name}>
          <span className={styles.title}>{project.name ?? project.id}</span>
          <span className={styles.id}>{project.id}</span>
        </span>
        {project.state && <Badge label={project.state} tone={toneOf(project.state)} />}
      </span>

      {stages.length > 0 && (
        <span className={styles.bar}>
          {stages.map((s, i) => (
            <span key={i} className={`${styles.cell} ${barClass(s)}`} />
          ))}
        </span>
      )}

      {(project.currentStage || project.doneCount) && (
        <span className={styles.meta}>
          {project.currentStage && <span className={styles.current}>{project.currentStage}</span>}
          {project.doneCount && <span className={styles.count}>{project.doneCount}</span>}
        </span>
      )}

      {project.updatedAt && <span className={styles.updated}>{project.updatedAt}</span>}
    </>
  );

  const cls = `${styles.card} ${selected ? styles.selected : ""}`;

  return onSelect ? (
    <button type="button" className={cls} data-project-id={project.id} onClick={onSelect}>
      {body}
    </button>
  ) : (
    <div className={cls} data-project-id={project.id}>
      {body}
    </div>
  );
}
