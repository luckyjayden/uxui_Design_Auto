import { createHashRouter, Navigate } from "react-router-dom";
import { Shell } from "./Shell";
import { ScreenView } from "./screens/ScreenView";
import { projectIds, screenIds } from "./data/load";

/* 화면 간 이동은 ia.json의 transitions가 정한다. 이동 21건을 실제로 엮는 일은
 * 08 Wireframe Rendering이 한다. 지금은 화면마다 경로만 잡아 둔다.
 *
 * HashRouter를 쓰는 까닭은 정적 호스팅에서 서버 설정 없이 돌아야 하기 때문이다.
 * BrowserRouter는 새로고침할 때 서버가 모든 경로를 index.html로 보내 줘야 한다. */

const pilot = projectIds()[0] ?? "ux-ai-studio";

export const router = createHashRouter([
  {
    path: "/",
    element: <Shell />,
    children: [
      { index: true, element: <Navigate to={`/${pilot}`} replace /> },
      { path: ":projectId", element: <ScreenView screenId="SCR-001" /> },
      ...screenIds(pilot).map((id) => ({
        path: `:projectId/${id}`,
        element: <ScreenView screenId={id} />,
      })),
    ],
  },
]);
