import { Outlet } from "react-router-dom";
import styles from "./Shell.module.css";

/* 틀이다. 화면 바깥의 자리만 잡는다.
 *
 * 헤더는 **화면의 영역**이지 틀의 것이 아니다. 일곱 화면의 A01이 모두
 * BLK-0001을 가리키므로 ScreenView가 다른 영역과 같은 방식으로 그린다.
 * A-0에서는 블록이 없어 여기에 자리만 잡아 두었는데 A-2에서 블록이 생겨 치웠다. */
export function Shell() {
  return (
    <div className={styles.shell}>
      <Outlet />
    </div>
  );
}
