import { createHashRouter, Navigate } from "react-router-dom";
import { Shell } from "./Shell";
import { ScreenView } from "./screens/ScreenView";
import { projectIds, screenIds } from "./data/load";

/* 화면 간 이동은 ia.json의 transitions가 정한다. 여기서는 화면마다 경로를 잡고,
 * 어느 자리를 누르면 어디로 가는지는 screens/transitions.ts가 영역에 건다.
 * 주소의 모양도 거기 pathTo가 쥔다 — 두 곳이 다르면 길이 끊긴다.
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
