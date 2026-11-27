import { createHashRouter, Navigate } from "react-router-dom";
import { Shell } from "./Shell";
import { ScreenStub } from "./screens/ScreenStub";
import { projectIds, screenIds } from "./data/load";

/* 화면 간 이동은 ia.json의 transitions가 정한다(A-1 뒤에 라우팅으로 엮는다).
 * A-0에서는 화면마다 자리만 잡아 둔다. 경로는 화면 ID를 그대로 쓴다.
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
      { path: ":projectId", element: <ScreenStub screenId="SCR-001" /> },
      ...screenIds(pilot).map((id) => ({
        path: `:projectId/${id}`,
        element: <ScreenStub screenId={id} />,
      })),
    ],
  },
]);
