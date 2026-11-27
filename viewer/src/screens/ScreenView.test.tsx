import { describe, expect, it } from "vitest";
import { render, screen as query } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ScreenView } from "./ScreenView";
import { screen as loadScreen } from "../data/load";
import { lookup } from "../render/blockRegistry";

function at(screenId: string) {
  return render(
    <MemoryRouter initialEntries={["/ux-ai-studio"]}>
      <Routes>
        <Route path=":projectId" element={<ScreenView screenId={screenId} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ScreenView — 렌더러를 부르는 껍데기", () => {
  it("화면 제목과 ID를 보인다", () => {
    at("SCR-005");
    expect(query.getByText("화면설계서 뷰어")).toBeInTheDocument();
    expect(query.getByText("SCR-005")).toBeInTheDocument();
  });

  it("진짜 화면이므로 미리보기 장치를 보이지 않는다", () => {
    at("SCR-001");
    // 영역 ID 배지도 인터랙션 버튼도 없다. 그것은 와이어프레임의 것이다.
    expect(query.queryByText("SCR-001-A01")).not.toBeInTheDocument();
    expect(query.queryByRole("button", { name: /글로벌 헤더/ })).not.toBeInTheDocument();
  });

  it("블록이 다 있으면 안내도 남은 수도 보이지 않는다", () => {
    at("SCR-001");
    const n = loadScreen("ux-ai-studio", "SCR-001")!.areas.filter(
      (a) => !lookup(a.block.id),
    ).length;
    expect(n).toBe(0); // 블록 스물이 영역 48개를 다 덮는다
    expect(query.queryAllByText("블록을 그리지 못했습니다")).toHaveLength(0);
    expect(query.queryByText(/블록이 아직 없습니다/)).not.toBeInTheDocument();
  });

  it("SCR-005의 A03은 와이어프레임이라 그 안에서만 장치가 켜진다", () => {
    const { container } = at("SCR-005");
    const a03 = container.querySelector('[data-area-id="SCR-005-A03"]')!;
    expect(a03).toHaveAttribute("data-rendered", "true");
    // 바깥(진짜 화면)에는 영역 머리가 없다
    expect(query.queryByText("SCR-005-A01")).not.toBeInTheDocument();
  });

  it("영역을 하나도 빠뜨리지 않는다", () => {
    const { container } = at("SCR-007");
    expect(container.querySelectorAll("[data-area-id]")).toHaveLength(
      loadScreen("ux-ai-studio", "SCR-007")!.areas.length,
    );
  });

  it("없는 화면은 죽지 않고 안내를 보인다", () => {
    at("SCR-999");
    expect(query.getByText(/읽지 못했습니다/)).toBeInTheDocument();
  });
});
