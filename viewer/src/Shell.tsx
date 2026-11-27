import { Outlet, useParams } from "react-router-dom";
import { READ_AT } from "./data/load";
import styles from "./Shell.module.css";

/* 틀이다. 블록이 아니다.
 *
 * 글로벌 헤더(BLK-0001)는 A-2에서 블록으로 만든다. 여기서는 그 자리를 잡아
 * 두기만 한다. 블록이 서면 이 자리를 블록으로 바꾼다. */
export function Shell() {
  const { projectId } = useParams();
  return (
    <div className={styles.shell}>
      <div className={styles.placeholder}>
        <span className={styles.blockId}>BLK-0001</span>
        <span>글로벌 헤더 — 아직 만들지 않았습니다 (A-2)</span>
        <span className={styles.readAt}>읽은 시점 {READ_AT.slice(0, 16).replace("T", " ")}</span>
      </div>
      <main className={styles.main}>
        <p className={styles.crumb}>{projectId}</p>
        <Outlet />
      </main>
    </div>
  );
}
