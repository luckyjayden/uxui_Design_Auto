import { describe, expect, it, vi } from "vitest";
import { render, screen as query, fireEvent } from "@testing-library/react";
import { GlobalHeader } from "./GlobalHeader";
import { screen as loadScreen } from "../../data/load";

/* BLK-0001이 SCR-001-A01의 디스크립션과 예외대로 도는지 본다.
 * 화면설계서가 구현 명세다. */

const a01 = loadScreen("ux-ai-studio", "SCR-001")!.areas[0];

describe("GlobalHeader — 레지스트리 props를 그대로 받는다 (POL-026)", () => {
  it("화면 파일의 props 키가 모두 컴포넌트의 prop이다", () => {
    // 일곱 화면의 A01이 넘기는 키를 전부 모아 본다
    const keys = new Set<string>();
    for (const n of [1, 2, 3, 4, 5, 6, 7]) {
      const s = loadScreen("ux-ai-studio", `SCR-00${n}`)!;
      const area = s.areas.find((a) => a.block.id === "BLK-0001");
      if (area) Object.keys(area.props).forEach((k) => keys.add(k));
    }
    expect([...keys].sort()).toEqual([
      "actions", "logo", "onRefresh", "readAt", "showBack", "showSearch", "title",
    ]);
  });

  it("로고와 타이틀을 보인다", () => {
    render(<GlobalHeader logo="UX AI Studio" title="프로젝트" />);
    expect(query.getByText("UX AI Studio")).toBeInTheDocument();
    expect(query.getByText("프로젝트")).toBeInTheDocument();
  });

  it("showBack이 거짓이면 뒤로가기를 두지 않는다 — 뷰어의 입구", () => {
    expect(a01.props.showBack).toBe(false); // 설계가 그렇게 적었다
    render(<GlobalHeader {...a01.props} showBack={false} />);
    expect(query.queryByLabelText("뒤로가기")).not.toBeInTheDocument();
  });

  it("showBack이 참이면 뒤로가기를 두고 누르면 onBack이 불린다", () => {
    const onBack = vi.fn();
    render(<GlobalHeader showBack onBack={onBack} />);
    fireEvent.click(query.getByLabelText("뒤로가기"));
    expect(onBack).toHaveBeenCalled();
  });

  it("showSearch가 참일 때만 검색을 둔다", () => {
    const { rerender } = render(<GlobalHeader showSearch={false} />);
    expect(query.queryByLabelText("검색")).not.toBeInTheDocument();
    rerender(<GlobalHeader showSearch />);
    expect(query.getByLabelText("검색")).toBeInTheDocument();
  });
});

describe("GlobalHeader — 읽은 시점과 새로고침 (BRQ-0016, POL-004)", () => {
  it("읽은 시점을 날짜와 시각까지 보인다", () => {
    // 디자인의 꼴: `11.27 15:20 읽음` (Figma node 1:253)
    render(<GlobalHeader readAt="2026-11-27T09:30:00+09:00" />);
    expect(query.getByText(/11\.27 \d\d:\d\d 읽음/)).toBeInTheDocument();
  });

  it("읽은 시점이 비어 있으면 시각을 지어내지 않는다", () => {
    render(<GlobalHeader readAt={null} />);
    expect(query.getByText("읽은 시점 없음")).toBeInTheDocument();
  });

  it("읽은 시점이 비어 있어도 새로고침은 누를 수 있다", () => {
    const onRefresh = vi.fn();
    render(<GlobalHeader readAt={null} onRefresh={onRefresh} />);
    const b = query.getByLabelText("새로고침");
    expect(b).toBeEnabled();
    fireEvent.click(b);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("새로고침은 읽은 시점을 지금으로 바꾼다", () => {
    const onRefresh = vi.fn();
    render(<GlobalHeader readAt="2026-01-01T00:00:00Z" onRefresh={onRefresh} />);
    fireEvent.click(query.getByLabelText("새로고침"));
    const passed = onRefresh.mock.calls[0][0] as string;
    expect(new Date(passed).getTime()).toBeGreaterThan(new Date("2026-01-01").getTime());
  });

  it("새로고침이 실패하면 값을 비우지 않고 알리기만 한다", () => {
    const onRefresh = vi.fn(() => {
      throw new Error("읽지 못함");
    });
    render(<GlobalHeader readAt="2026-11-27T09:30:00+09:00" onRefresh={onRefresh} />);
    fireEvent.click(query.getByLabelText("새로고침"));
    expect(query.getByText("다시 읽지 못했습니다")).toBeInTheDocument();
    // 앞서 읽은 시점이 그대로 남는다
    expect(query.getByText(/11\.27 \d\d:\d\d 읽음/)).toBeInTheDocument();
  });

  it("망가진 시각은 '없음'으로 본다. 지어내지 않는다", () => {
    render(<GlobalHeader readAt="그런 날짜 없음" />);
    expect(query.getByText("읽은 시점 없음")).toBeInTheDocument();
  });
});

describe("GlobalHeader — 바깥으로 나가는 링크", () => {
  it("주소가 있으면 새 탭으로 여는 링크다", () => {
    render(<GlobalHeader actions="저장소 열기" actionsHref="https://github.com/x/y" />);
    const a = query.getByText("저장소 열기");
    expect(a).toHaveAttribute("href", "https://github.com/x/y");
    expect(a).toHaveAttribute("target", "_blank");
    expect(a).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
  });

  it("주소를 만들지 못하면 비활성으로 두고 안내를 보인다", () => {
    render(<GlobalHeader actions="저장소 열기" />);
    expect(query.getByText("연결할 곳이 없습니다")).toBeInTheDocument();
    expect(query.queryByRole("link")).not.toBeInTheDocument();
  });

  it("뷰어는 저장소에 쓰지 않는다 — 폼도 전송 버튼도 없다", () => {
    const { container } = render(<GlobalHeader {...a01.props} showSearch />);
    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector('[type="submit"]')).toBeNull();
  });
});

describe("GlobalHeader — 검색", () => {
  it("검색어가 바뀌면 onSearch가 불린다", () => {
    const onSearch = vi.fn();
    render(<GlobalHeader showSearch onSearch={onSearch} />);
    fireEvent.change(query.getByLabelText("검색"), { target: { value: "ux" } });
    expect(onSearch).toHaveBeenCalledWith("ux");
  });
});

describe("GlobalHeader — Figma 디자인과 맞는지", () => {
  it("로고와 화면 이름 사이에 구분선을 둔다", () => {
    const { container } = render(<GlobalHeader logo="UX AI Studio" title="프로젝트" />);
    expect(container.querySelector('[class*="divider"]')).toBeInTheDocument();
  });

  it("로고만 있으면 구분선을 두지 않는다", () => {
    const { container } = render(<GlobalHeader logo="UX AI Studio" />);
    expect(container.querySelector('[class*="divider"]')).not.toBeInTheDocument();
  });

  it("아이콘을 Figma에서 받은 자산으로 쓴다", () => {
    const { container } = render(<GlobalHeader showBack showSearch actions="저장소 열기" />);
    const srcs = [...container.querySelectorAll("img")].map((i) => i.getAttribute("src") ?? "");

    // 뒤로가기·검색·시계·새로고침 넷. Vite가 작은 SVG를 data URI로 인라인하므로
    // 파일 이름이 아니라 그림의 path로 가린다.
    expect(srcs).toHaveLength(4);
    expect(srcs.every((s) => s.startsWith("data:image/svg+xml"))).toBe(true);

    // 임시 Figma 주소가 남아 있으면 안 된다. 7일이면 끊긴다.
    expect(srcs.every((s) => !s.includes("figma.com"))).toBe(true);

    const joined = srcs.join(" ");
    expect(joined).toContain("M10%2012L6%208L10%204"); // chevron-left
    expect(joined).toContain("M14%2014L11.1%2011.1"); // search
    expect(joined).toContain("M7%203.5V7L9.33333%208.16667"); // clock
    expect(joined).toContain("M15.3333%202.66667V6.66667H11.3333"); // refresh
  });

  it("아이콘 크기를 디자인대로 둔다", () => {
    const { container } = render(<GlobalHeader showBack />);
    const back = container.querySelector('[aria-label="뒤로가기"] img');
    expect(back).toHaveAttribute("width", "16");
    const clockImg = container.querySelector('[class*="readAt"] img');
    expect(clockImg).toHaveAttribute("width", "14");
  });

  it("검색 자리표는 디자인의 글을 쓴다", () => {
    render(<GlobalHeader showSearch />);
    expect(query.getByPlaceholderText("프로젝트 이름 검색")).toBeInTheDocument();
  });
});
