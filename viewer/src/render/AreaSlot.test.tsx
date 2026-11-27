import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen as query, fireEvent } from "@testing-library/react";

/* 블록을 찾았을 때의 길이다. 레지스트리가 아직 비어 있어 가짜 블록을 끼워 본다.
 *
 * A-2부터 블록이 실제로 들어오면 이 시험이 그 블록으로 바뀌는 것이 아니라,
 * 블록마다 제 시험을 갖는다. 여기서 보는 것은 **렌더러가 블록을 어떻게 부르는가**다. */

const lookup = vi.fn();
vi.mock("./blockRegistry", () => ({
  lookup: (id: string) => lookup(id),
  registered: () => [],
}));

const { AreaSlot } = await import("./AreaSlot");
const { screen: loadScreen } = await import("../data/load");

const area = loadScreen("ux-ai-studio", "SCR-005")!.areas.find(
  (a) => a.id === "SCR-005-A03",
)!;
const state = loadScreen("ux-ai-studio", "SCR-005")!.state;

function draw(extra = {}) {
  return render(
    <AreaSlot
      area={area}
      state={state}
      setState={vi.fn()}
      selected={false}
      onSelect={vi.fn()}
      unrenderedMessage="블록을 그리지 못했습니다"
      chrome
      {...extra}
    />,
  );
}

beforeEach(() => lookup.mockReset());

describe("AreaSlot — 블록을 찾았을 때", () => {
  it("블록을 그리고 안내를 보이지 않는다", () => {
    lookup.mockReturnValue(() => <p>그려진 블록</p>);
    const { container } = draw();
    expect(query.getByText("그려진 블록")).toBeInTheDocument();
    expect(query.queryByText("블록을 그리지 못했습니다")).not.toBeInTheDocument();
    expect(container.querySelector("[data-rendered]")).toHaveAttribute("data-rendered", "true");
  });

  it("영역의 props를 풀어서 넘긴다", () => {
    const Block = vi.fn((_props: Record<string, unknown>) => <p>블록</p>);
    lookup.mockReturnValue(Block);
    draw();
    const passed = Block.mock.calls[0][0];
    // state 키는 값으로, 글자 그대로는 그대로
    expect(passed.areas).toBe(state.screenAreas);
    expect(passed.unrenderedMessage).toBe("블록을 그리지 못했습니다");
    // on*은 콜백이 된다
    expect(typeof passed.onSelectArea).toBe("function");
  });

  it("블록이 던져도 그 자리만 비지 않는다 — 블록 ID를 들고 있다", () => {
    lookup.mockReturnValue(undefined);
    const { container } = draw();
    expect(container.querySelector("[data-block-id]")).toHaveAttribute(
      "data-block-id",
      "BRQ-0011",
    );
  });
});

describe("AreaSlot — 블록을 못 찾았을 때", () => {
  it("블록 ID와 안내를 보인다", () => {
    lookup.mockReturnValue(undefined);
    const { container } = draw();
    expect(query.getByText("블록을 그리지 못했습니다")).toBeInTheDocument();
    expect(query.getAllByText("BRQ-0011").length).toBeGreaterThan(0);
    expect(container.querySelector("[data-rendered]")).toHaveAttribute("data-rendered", "false");
  });

  it("미리보기에서는 그래도 고를 수 있다", () => {
    lookup.mockReturnValue(undefined);
    const onSelect = vi.fn();
    draw({ onSelect });
    fireEvent.click(query.getByText("와이어프레임"));
    expect(onSelect).toHaveBeenCalled();
  });

  it("미리보기에서는 그래도 인터랙션 자리가 남는다", () => {
    lookup.mockReturnValue(undefined);
    draw();
    expect(query.getByText("영역을 누른다")).toBeInTheDocument();
  });
});

describe("AreaSlot — 미리보기 장치는 chrome에만 달린다", () => {
  it("진짜 화면에는 영역 ID 머리가 없다", () => {
    lookup.mockReturnValue(undefined);
    draw({ chrome: false });
    expect(query.queryByText("SCR-005-A03")).not.toBeInTheDocument();
    expect(query.queryByRole("button", { name: /와이어프레임/ })).not.toBeInTheDocument();
  });

  it("진짜 화면에는 인터랙션 버튼이 없다", () => {
    lookup.mockReturnValue(undefined);
    draw({ chrome: false });
    expect(query.queryByText("영역을 누른다")).not.toBeInTheDocument();
  });

  it("진짜 화면에도 못 그린 자리의 안내는 남는다", () => {
    lookup.mockReturnValue(undefined);
    const { container } = draw({ chrome: false });
    expect(query.getByText("블록을 그리지 못했습니다")).toBeInTheDocument();
    expect(container.querySelector("[data-area-id]")).toBeInTheDocument();
  });

  it("진짜 화면에서도 블록은 그대로 그린다", () => {
    lookup.mockReturnValue(() => <p>그려진 블록</p>);
    draw({ chrome: false });
    expect(query.getByText("그려진 블록")).toBeInTheDocument();
  });
});
