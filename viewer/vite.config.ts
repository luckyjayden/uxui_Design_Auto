import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 뷰어는 서버 없이 도는 읽기 전용 정적 앱이다(POL-034). 프로젝트 데이터는
// 빌드할 때 JSON으로 묶어 들어가고, 실행 중에 저장소를 읽지 않는다.
// 빌드 시점. 데이터가 빌드할 때 묶여 들어오므로 이것이 곧 '읽은 시점'이다(POL-004).
const BUILT_AT = new Date().toISOString();

export default defineConfig({
  plugins: [react()],
  define: { __BUILT_AT__: JSON.stringify(BUILT_AT) },
  base: "./",
  server: {
    // projects/는 viewer/ 바깥이라 읽을 수 있게 열어 둔다. 읽기뿐이다.
    fs: { allow: [".."] },
  },
  test: {
    // globals를 켜야 Testing Library의 afterEach 자동 정리가 돈다.
    // 끄면 앞 시험의 DOM이 남아 다음 시험이 같은 요소를 두 번 찾는다.
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
  },
});
