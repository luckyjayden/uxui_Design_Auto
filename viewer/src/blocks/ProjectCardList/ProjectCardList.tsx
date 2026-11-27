import { ProjectCard, type Project } from "../../base/ProjectCard/ProjectCard";
import styles from "./ProjectCardList.module.css";

/* BRQ-0001 프로젝트 카드 목록
 *
 * 디자인   Figma 6sNGJRUgMlVSCDuym6e08z  node 6:486 (Block/ProjectCardList)
 * 쓰는 곳   SCR-001-A02
 *
 * `keyword`로 **이미 읽어 둔 목록의 이름만 거른다.** 저장소를 다시 뒤지지
 * 않는다(SCR-001-A01의 디스크립션 2번). */

export interface ProjectCardListProps {
  items?: Project[];
  onSelect?: (id: string) => void;
  selectedId?: string | null;
  /** 이름을 거르는 말. */
  keyword?: string;
  emptyMessage?: string;
  /** 거른 결과가 없을 때. 설계가 제목을 바꾸라고 했다(BLK-0012의 설명). */
  noResultMessage?: string;
}

export function ProjectCardList({
  items = [],
  onSelect,
  selectedId = null,
  keyword,
  emptyMessage = "볼 수 있는 프로젝트가 없습니다",
  noResultMessage = "검색 결과가 없습니다",
}: ProjectCardListProps) {
  const q = (keyword ?? "").trim().toLowerCase();
  const shown = q
    ? items.filter((p) => `${p.name ?? ""} ${p.id}`.toLowerCase().includes(q))
    : items;

  if (shown.length === 0) {
    return (
      <div className={styles.grid}>
        <p className={styles.empty}>{items.length === 0 ? emptyMessage : noResultMessage}</p>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {shown.map((p) => (
        <ProjectCard
          key={p.id}
          project={p}
          selected={p.id === selectedId}
          onSelect={onSelect ? () => onSelect(p.id) : undefined}
        />
      ))}
    </div>
  );
}
