import { describe, expect, it } from "vitest";
import { buildState } from "./screenState";
import { screen, screenIds } from "./load";

/* 화면 파일의 state 키가 저장소 데이터로 채워지는지 본다.
 * 파이프라인 v2의 08 Wireframe Rendering이 하는 일이다. */

const P = "ux-ai-studio";

describe("buildState — 화면 파일의 키를 하나도 빠뜨리지 않는다", () => {
  it("일곱 화면 모두 선언된 키를 그대로 갖는다", () => {
    for (const id of screenIds(P)) {
      const declared = Object.keys(screen(P, id)!.state);
      const built = buildState(P, id);
      for (const k of declared) {
        expect(built, `${id}의 ${k}`).toHaveProperty(k);
      }
    }
  });

  it("설계에 없는 키를 함부로 더하지 않는다 — 더한 것은 블록이 쓰는 곁값뿐", () => {
    const extra = new Set<string>();
    for (const id of screenIds(P)) {
      const declared = new Set(Object.keys(screen(P, id)!.state));
      for (const k of Object.keys(buildState(P, id))) {
        if (!declared.has(k)) extra.add(k);
      }
    }
    // 화면 파일에 자리가 없어 더한 것들. 늘어나면 설계에 되돌려야 한다.
    expect([...extra].sort()).toEqual([
      "branchPolicies",
      "currentIndex",
      "waitingOthers",
      "waitingTitle",
    ]);
  });
});

describe("buildState — 저장소에서 읽은 값만 넣는다 (POL-004)", () => {
  it("SCR-001은 프로젝트를 저장소에서 센다", () => {
    const s = buildState(P, "SCR-001") as { projects: { id: string; stages: string[] }[] };
    expect(s.projects).toHaveLength(1);
    expect(s.projects[0].id).toBe(P);
    expect(s.projects[0].stages).toHaveLength(7);
  });

  it("프로젝트 이름을 지어내지 않는다. project.json에 이름 칸이 없다", () => {
    const s = buildState(P, "SCR-001") as { projects: { name: string }[] };
    expect(s.projects[0].name).toBe(P);
  });

  it("SCR-002의 일곱 단계가 status.json에서 온다", () => {
    const s = buildState(P, "SCR-002") as {
      stages: { id: string; name: string; docs?: unknown[] }[];
    };
    expect(s.stages.map((x) => x.id)).toEqual([
      "project", "requirements", "policy", "flow", "ia", "screen", "qa",
    ]);
    // 플로우 단계만 두 문서를 한 칸으로 묶는다(POL-006)
    expect(s.stages.find((x) => x.id === "flow")?.docs).toHaveLength(2);
    expect(s.stages.find((x) => x.id === "policy")?.docs).toBeUndefined();
  });

  it("SCR-003은 고른 문서의 항목을 읽는다", () => {
    const req = buildState(P, "SCR-003", { docCode: "REQ" }) as { items: unknown[] };
    const pol = buildState(P, "SCR-003", { docCode: "POL" }) as { items: unknown[] };
    expect(req.items).toHaveLength(21);
    expect(pol.items).toHaveLength(21);
  });

  it("SCR-003의 참조는 양쪽으로 본다", () => {
    const s = buildState(P, "SCR-003", { docCode: "POL", selectedItemId: "POL-005" }) as {
      parentRefs: { items: { id: string }[] };
      childRefs: { items: { id: string }[] };
    };
    // POL-005는 REQ를 가리키고(상위), POL-006이 POL-005를 가리킨다(하위)
    expect(s.parentRefs.items.length).toBeGreaterThan(0);
    expect(s.childRefs.items.length).toBeGreaterThan(0);
  });

  it("SCR-004는 유저·워크 플로우를 갈아 끼운다", () => {
    const uf = buildState(P, "SCR-004", { flowKind: "user" }) as { nodes: unknown[] };
    const wf = buildState(P, "SCR-004", { flowKind: "work" }) as { nodes: unknown[] };
    expect(uf.nodes).toHaveLength(42);
    expect(wf.nodes).toHaveLength(42);
  });

  it("SCR-004의 연결 56개가 모두 정책을 가진다", () => {
    const s = buildState(P, "SCR-004", { flowKind: "user" }) as {
      edges: { policy: string | null }[];
    };
    expect(s.edges).toHaveLength(56);
    expect(s.edges.every((e) => e.policy)).toBe(true);
  });

  it("SCR-005는 화면 일곱과 고른 화면의 영역을 읽는다", () => {
    const s = buildState(P, "SCR-005", { screenId: "SCR-005" }) as {
      screens: unknown[];
      screenAreas: unknown[];
    };
    expect(s.screens).toHaveLength(7);
    expect(s.screenAreas).toHaveLength(9);
  });

  it("SCR-005는 고른 영역의 디스크립션·예외를 끌어낸다", () => {
    const s = buildState(P, "SCR-005", {
      screenId: "SCR-005",
      selectedAreaId: "SCR-005-A03",
    }) as { areaDescription: string[]; areaExceptions: string[] };
    expect(s.areaDescription.length).toBeGreaterThan(0);
    expect(s.areaExceptions.length).toBeGreaterThan(0);
  });

  it("SCR-006은 validation.json의 규칙 일곱을 읽는다", () => {
    const s = buildState(P, "SCR-006") as {
      rules: { id: string; verdict: string }[];
      summary: { id: string; value: unknown }[];
    };
    expect(s.rules).toHaveLength(7);
    expect(s.summary.find((m) => m.id === "passed")?.value).toBe(6);
    expect(s.summary.find((m) => m.id === "failed")?.value).toBe(1);
  });

  it("SCR-006은 판정을 다시 매기지 않는다. validation.json 그대로다", () => {
    const s = buildState(P, "SCR-006") as { rules: { id: string; verdict: string }[] };
    expect(s.rules.find((r) => r.id === "QA-06")?.verdict).toBe("실패");
    expect(s.rules.find((r) => r.id === "QA-01")?.verdict).toBe("통과");
  });

  it("SCR-007은 changes.json의 변경과 판정을 그대로 쓴다 (POL-019)", () => {
    const s = buildState(P, "SCR-007") as {
      changes: unknown[];
      needsFix: { items: unknown[] };
      needsReview: { items: unknown[] };
    };
    expect(s.changes).toHaveLength(10);
    expect(s.needsFix.items.length).toBeGreaterThan(0);
    expect(s.needsReview.items.length).toBeGreaterThan(0);
  });
});

describe("buildState — 없는 것은 비운다. 지어내지 않는다", () => {
  it("고른 것이 없으면 딸린 값도 비어 있다", () => {
    const s = buildState(P, "SCR-006") as { ruleDetail: unknown; ruleVerdict: unknown };
    expect(s.ruleDetail).toBeNull();
    expect(s.ruleVerdict).toBeNull();
  });

  it("열린 PR은 조회하지 않으므로 늘 비어 있다 (MVP 밖)", () => {
    const s = buildState(P, "SCR-002") as { pullRequests: unknown[] };
    expect(s.pullRequests).toEqual([]);
  });

  it("없는 프로젝트는 죽지 않고 빈 값을 돌려준다", () => {
    const s = buildState("없는프로젝트", "SCR-003") as { items: unknown[] };
    expect(s.items).toEqual([]);
  });
});
