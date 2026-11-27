import { describe, expect, it } from "vitest";
import { render, screen as query } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ScreenView } from "./ScreenView";
import { screen as loadScreen } from "../data/load";

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

  it("previewState를 화면 파일의 state로 초기화한다", () => {
    // SCR-005의 state 키가 previewState로 들어가야 A03의 인터랙션이 돈다
    const { container } = at("SCR-005");
    const a03 = container.querySelector('[data-area-id="SCR-005-A03"]');
    expect(a03).toBeInTheDocument();
    // set이 가리키는 키가 state에 있으므로 트리거가 눌릴 수 있어야 한다
    expect(query.getByText("영역을 누른다")).toBeEnabled();
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
