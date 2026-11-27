import { describe, expect, it } from "vitest";
import { render, screen as query } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ScreenStub } from "./ScreenStub";

function at(path: string, screenId: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path=":projectId" element={<ScreenStub screenId={screenId} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ScreenStub — 화면 파일을 읽어 영역을 늘어놓는다", () => {
  it("SCR-005의 영역 아홉을 적힌 순서 그대로 보인다", () => {
    at("/ux-ai-studio", "SCR-005");
    const ids = query
      .getAllByText(/^SCR-005-A\d\d$/)
      .map((n) => n.textContent);
    expect(ids).toEqual([
      "SCR-005-A01", "SCR-005-A02", "SCR-005-A03", "SCR-005-A04", "SCR-005-A05",
      "SCR-005-A06", "SCR-005-A07", "SCR-005-A08", "SCR-005-A09",
    ]);
  });

  it("영역이 가리키는 블록 ID를 보인다", () => {
    at("/ux-ai-studio", "SCR-005");
    expect(query.getByText("BRQ-0011")).toBeInTheDocument();
    expect(query.getAllByText("BLK-0001").length).toBeGreaterThan(0);
  });

  it("없는 화면은 죽지 않고 안내를 보인다", () => {
    at("/ux-ai-studio", "SCR-999");
    expect(query.getByText(/읽지 못했습니다/)).toBeInTheDocument();
  });
});
