import { describe, expect, it } from "vitest";
import {
  items,
  projectIds,
  projects,
  read,
  screen,
  screenIds,
  status,
  workUnits,
} from "./load";

/* A-0의 완료 조건이다. data/load.ts가 저장소의 프로젝트 데이터에 실제로 닿는지 본다.
 * 묶여 들어온 JSON을 읽으므로 네트워크도 파일 시스템도 쓰지 않는다. */

describe("load — 저장소를 읽는 유일한 통로", () => {
  it("프로젝트를 찾는다", () => {
    expect(projectIds()).toContain("ux-ai-studio");
  });

  it("화면 일곱 장을 ia.json 순서로 돌려준다", () => {
    expect(screenIds("ux-ai-studio")).toEqual([
      "SCR-001", "SCR-002", "SCR-003", "SCR-004", "SCR-005", "SCR-006", "SCR-007",
    ]);
  });

  it("화면 파일을 읽고 영역이 48개다", () => {
    const total = screenIds("ux-ai-studio")
      .map((id) => screen("ux-ai-studio", id)?.areas.length ?? 0)
      .reduce((a, b) => a + b, 0);
    expect(total).toBe(48);
  });

  it("영역마다 블록과 요구사항과 정책이 하나 이상 있다", () => {
    for (const id of screenIds("ux-ai-studio")) {
      for (const area of screen("ux-ai-studio", id)!.areas) {
        expect(area.block.id).toMatch(/^(BLK|BRQ)-\d{4}$/);
        expect(area.requirements.length).toBeGreaterThan(0);
        expect(area.policies.length).toBeGreaterThan(0);
      }
    }
  });

  it("문서 항목을 읽는다", () => {
    expect(items("ux-ai-studio", "REQ")).toHaveLength(21);
    expect(items("ux-ai-studio", "POL")).toHaveLength(21);
    expect(items("ux-ai-studio", "UF")).toHaveLength(42);
    expect(items("ux-ai-studio", "WF")).toHaveLength(42);
  });

  it("작업 단위 넷을 읽는다", () => {
    const wu = workUnits("ux-ai-studio");
    expect(wu.map((w) => w.id)).toEqual(["WU-001", "WU-002", "WU-003", "WU-004"]);
  });

  it("문서 상태를 읽는다. 뷰어는 바꾸지 않는다", () => {
    const rows = status("ux-ai-studio");
    expect(rows.map((r) => r.doc)).toContain("SB");
    expect(rows.every((r) => typeof r.state === "string")).toBe(true);
  });

  it("프로젝트 목록을 만든다", () => {
    const list = projects();
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]).toHaveProperty("status");
  });

  it("없는 파일은 null로 돌려주고 던지지 않는다", () => {
    expect(read("ux-ai-studio", "없는파일.json")).toBeNull();
    expect(screen("ux-ai-studio", "SCR-999")).toBeNull();
    expect(screen("없는프로젝트", "SCR-001")).toBeNull();
  });

  it("없는 프로젝트의 항목은 빈 배열이다", () => {
    expect(items("없는프로젝트", "REQ")).toEqual([]);
    expect(workUnits("없는프로젝트")).toEqual([]);
  });
});
