import { useParams } from "react-router-dom";
import { screen } from "../data/load";
import styles from "./ScreenStub.module.css";

/* A-0의 자리잡기다. 화면 파일을 읽어 영역이 몇이고 어떤 블록을 가리키는지만 보인다.
 *
 * 영역을 실제로 그리는 것은 A-1의 와이어프레임(BRQ-0011)이 한다. 그때 이 파일은
 * 렌더러를 부르는 얇은 껍데기가 된다. */
export function ScreenStub({ screenId }: { screenId: string }) {
  const { projectId } = useParams();
  const data = projectId ? screen(projectId, screenId) : null;

  if (!data) {
    return (
      <p className={styles.missing}>
        {screenId}을 읽지 못했습니다. 화면 파일이 없습니다.
      </p>
    );
  }

  return (
    <section>
      <h1 className={styles.title}>
        <span className={styles.id}>{data.id}</span>
        {data.title}
      </h1>
      <p className={styles.note}>
        영역 {data.areas.length}개 · state 키 {Object.keys(data.state).length}개.
        영역을 그리는 것은 와이어프레임(BRQ-0011)이 서면 됩니다.
      </p>
      <ol className={styles.areas}>
        {data.areas.map((a) => (
          <li key={a.id} className={styles.area}>
            <span className={styles.id}>{a.id}</span>
            <span className={styles.areaTitle}>{a.title}</span>
            <span className={styles.block}>
              {a.block.id} <code>{a.block.version}</code>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
