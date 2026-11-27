import { describe, expect, it, vi } from "vitest";
import { render, screen as query, fireEvent } from "@testing-library/react";
import { Wireframe } from "./Wireframe";
import { lookup, registered } from "./blockRegistry";
import { screen, screenIds, type Area } from "../data/load";

/* A-1의 완료 조건이다.
 *
 *   "블록이 하나도 없어도 SCR-001의 영역 4개 자리가 '블록을 그리지 못했습니다'로
 *    그려진다"
 *
 * 블록 없이도 설 수 있어야 뒤의 모든 작업을 확인하는 수단이 된다. */

const P = "ux-ai-studio";
const areasOf = (id: string): Area[] => screen(P, id)!.areas;

/** 아직 블록이 없는 영역. 블록을 만들수록 줄어든다. */
const unrenderedOf = (id: string) => areasOf(id).filter((a) => !lookup(a.block.id));

function draw(id: string, extra: Partial<Parameters<typeof Wireframe>[0]> = {}) {
  return render(
    <Wireframe
      areas={areasOf(id)}
      previewState={screen(P, id)!.state}
      unrenderedMessage="블록을 그리지 못했습니다"
      emptyMessage="영역이 없습니다"
      {...extra}
    />,
  );
}

describe("Wireframe (BRQ-0011) — 블록이 없어도 선다", () => {
  it("지금까지 만든 블록 — 이 줄이 진도다", () => {
    // 블록을 만들 때마다 한 줄씩 는다. 수를 세는 다른 시험들은 이것을 보고
    // 저절로 따라오므로 손댈 필요가 없다.
    expect(registered()).toEqual([
      "BLK-0001", "BLK-0003", "BLK-0012", "BLK-0013", "BLK-0020",
      "BRQ-0001", "BRQ-0002", "BRQ-0003", "BRQ-0004", "BRQ-0005", "BRQ-0006",
      "BRQ-0007", "BRQ-0008", "BRQ-0009", "BRQ-0010", "BRQ-0011", "BRQ-0012",
      "BRQ-0013", "BRQ-0014", "BRQ-0015",
    ]);
  });

  it("블록이 없는 자리마다 안내가 뜬다", () => {
    const { container } = draw("SCR-001");
    expect(container.querySelectorAll("[data-area-id]")).toHaveLength(4);
    const missing = unrenderedOf("SCR-001");
    expect(query.queryAllByText("블록을 그리지 못했습니다")).toHaveLength(missing.length);
  });

  it("이제 영역 48개가 모두 블록으로 그려진다", () => {
    for (const id of screenIds(P)) {
      expect(unrenderedOf(id)).toEqual([]);
    }
  });

  it("블록이 있는 자리는 블록으로 그린다", () => {
    const { container } = draw("SCR-001");
    const header = container.querySelector('[data-area-id="SCR-001-A01"]');
    expect(header).toHaveAttribute("data-rendered", "true");
  });

  it("화면 일곱 장의 영역 48개가 하나도 빠지지 않는다", () => {
    let total = 0;
    for (const id of screenIds(P)) {
      const { container, unmount } = draw(id);
      total += container.querySelectorAll("[data-area-id]").length;
      unmount();
    }
    expect(total).toBe(48);
  });
});

describe("Wireframe — 적힌 순서 그대로 그린다 (POL-014)", () => {
  it("SCR-005의 영역 아홉이 화면 파일 순서와 같다", () => {
    const { container } = draw("SCR-005");
    const drawn = [...container.querySelectorAll("[data-area-id]")].map(
      (n) => n.getAttribute("data-area-id"),
    );
    expect(drawn).toEqual(areasOf("SCR-005").map((a) => a.id));
  });

  it("자리를 바꾸거나 빼지 않는다 — 모든 화면에서", () => {
    for (const id of screenIds(P)) {
      const { container, unmount } = draw(id);
      const drawn = [...container.querySelectorAll("[data-area-id]")].map(
        (n) => n.getAttribute("data-area-id"),
      );
      expect(drawn).toEqual(areasOf(id).map((a) => a.id));
      unmount();
    }
  });
});

describe("Wireframe — 못 그린 영역도 고를 수 있다", () => {
  it("영역 머리를 누르면 onSelectArea가 그 영역 ID로 불린다", () => {
    const onSelectArea = vi.fn();
    draw("SCR-001", { onSelectArea });
    fireEvent.click(query.getByText("프로젝트 카드 목록"));
    expect(onSelectArea).toHaveBeenCalledWith("SCR-001-A02");
  });

  it("고른 영역에 표시가 붙는다", () => {
    const { container } = draw("SCR-001", { selectedAreaId: "SCR-001-A03" });
    const sel = container.querySelector('[data-area-id="SCR-001-A03"]');
    expect(sel?.className).toMatch(/selected/);
  });

  it("블록 ID를 자리마다 보인다", () => {
    const { container } = draw("SCR-005");
    const ids = [...container.querySelectorAll("[data-block-id]")].map((n) =>
      n.getAttribute("data-block-id"),
    );
    expect(ids).toEqual(areasOf("SCR-005").map((a) => a.block.id));
    expect(ids).toContain("BRQ-0011");
  });
});

describe("Wireframe — 인터랙션은 React State로만 돈다", () => {
  it("트리거를 누르면 set이 가리키는 키가 previewState에서 바뀐다", () => {
    const onPreviewStateChange = vi.fn();
    const areas = areasOf("SCR-005");
    const a03 = areas.find((a) => a.id === "SCR-005-A03")!;
    render(
      <Wireframe
        areas={[a03]}
        previewState={screen(P, "SCR-005")!.state}
        onPreviewStateChange={onPreviewStateChange}
      />,
    );
    fireEvent.click(query.getByText("영역을 누른다"));
    expect(onPreviewStateChange).toHaveBeenCalledTimes(1);
    expect(onPreviewStateChange.mock.calls[0][0]).toHaveProperty("selectedAreaId");
  });

  it("set이 가리키는 키가 state에 없으면 눌러도 아무 일이 없고 안내가 뜬다", () => {
    const onPreviewStateChange = vi.fn();
    const broken: Area = {
      ...areasOf("SCR-001")[0],
      id: "SCR-001-A99",
      interactions: [{ trigger: "눌러 본다", set: "없는키", result: "r" }],
    };
    render(
      <Wireframe areas={[broken]} previewState={{}} onPreviewStateChange={onPreviewStateChange} />,
    );
    const button = query.getByText("눌러 본다");
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onPreviewStateChange).not.toHaveBeenCalled();
    expect(query.getByText(/인터랙션을 돌리지 못했습니다/)).toBeInTheDocument();
  });

  it("set이 null인 인터랙션은 눌러도 state를 바꾸지 않는다", () => {
    const onPreviewStateChange = vi.fn();
    const outward: Area = {
      ...areasOf("SCR-001")[0],
      id: "SCR-001-A98",
      interactions: [{ trigger: "바깥으로 나간다", set: null, result: "r" }],
    };
    render(
      <Wireframe areas={[outward]} previewState={{}} onPreviewStateChange={onPreviewStateChange} />,
    );
    fireEvent.click(query.getByText("바깥으로 나간다"));
    expect(onPreviewStateChange).not.toHaveBeenCalled();
  });
});

describe("Wireframe — 예외", () => {
  it("영역이 하나도 없으면 emptyMessage를 보인다", () => {
    render(<Wireframe areas={[]} emptyMessage="영역이 없습니다" />);
    expect(query.getByText("영역이 없습니다")).toBeInTheDocument();
  });

  it("다 그렸으면 남은 수를 보이지 않는다", () => {
    draw("SCR-001");
    expect(query.queryByText(/블록이 아직 없습니다/)).not.toBeInTheDocument();
  });
});

describe("Wireframe — 자기 자신을 그린다", () => {
  it("SCR-005-A03은 BRQ-0011을 가리키므로 와이어프레임이 한 겹 더 선다", () => {
    const { container } = draw("SCR-005");
    const a03 = container.querySelector('[data-area-id="SCR-005-A03"]')!;
    // 바깥은 그렸다고 표시되고
    expect(a03).toHaveAttribute("data-rendered", "true");
    // 안쪽은 screenAreas가 []라 '영역이 없습니다'를 보인다
    expect(a03.textContent).toContain("영역이 없습니다");
    expect(a03.textContent).not.toContain("블록을 그리지 못했습니다");
  });

  it("안쪽 와이어프레임은 바깥의 영역을 다시 세지 않는다", () => {
    const { container } = draw("SCR-005");
    // 영역 자리는 아홉 그대로다. 겹쳐 그려 수가 늘지 않는다.
    expect(container.querySelectorAll("[data-area-id]")).toHaveLength(9);
  });
});
