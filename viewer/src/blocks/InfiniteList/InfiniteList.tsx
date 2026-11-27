import { EmptyState } from "../EmptyState/EmptyState";

/* BLK-0013 무한 스크롤 목록 — A-20
 *
 * 쓰는 곳  SCR-002-A06 열려 있는 PR 목록 하나
 *
 * **MVP에서 만들지 않는다.** [개발 로드맵](docs/11-dev-roadmap.md) 2절이
 * "열려 있는 PR 목록의 실시간 조회"를 밖으로 미뤘고, 조회가 없으면 다음 쪽을
 * 불러올 일도 없다. Figma의 디자인에도 이 블록이 없다.
 *
 * **화면설계서는 고치지 않았다.** 설계는 맞고 구현 범위만 좁힌 것이라,
 * 자리를 비우지 않고 왜 비었는지 보인다. 조회를 붙일 때 되살린다.
 *
 * 자리를 메우는 데 BLK-0012 빈 상태를 쓴다. 영역의 수는 그대로다. */

export interface InfiniteListProps {
  renderItem?: unknown;
  loading?: boolean;
  endMessage?: boolean | string;
  showScrollTop?: boolean;
  repoHref?: string;
}

export function InfiniteList({ repoHref }: InfiniteListProps) {
  return (
    <EmptyState
      illustration="첫 사용"
      title="열린 PR은 GitHub에서 봅니다"
      description="PR을 뷰어 안에서 조회하는 것은 이번 범위 밖입니다(개발 로드맵 2절). 저장소에서 확인하십시오."
      action={repoHref ? "저장소 열기" : undefined}
      actionHref={repoHref}
    />
  );
}
