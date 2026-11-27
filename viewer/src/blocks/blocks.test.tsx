import { describe, expect, it, vi } from "vitest";
import { render, screen as query, fireEvent } from "@testing-library/react";
import { TabContent } from "./TabContent/TabContent";
import { ButtonGroup } from "./ButtonGroup/ButtonGroup";
import { EmptyState } from "./EmptyState/EmptyState";
import { RefList } from "./RefList/RefList";
import { AreaDetailPanel } from "./AreaDetailPanel/AreaDetailPanel";
import { ExportStatusBar } from "./ExportStatusBar/ExportStatusBar";
import { toneOf } from "../base/Badge/Badge";

/* P0 블록 일곱이 설계와 디자인대로 도는지 본다.
 * 화면설계서가 구현 명세이고 Figma의 컴포넌트 설명이 그것을 그대로 옮겼다. */

describe("BLK-0020 탭 콘텐츠", () => {
  const tabs = [
    { id: "REQ", label: "요구사항 정의서", state: "승인" },
    { id: "POL", label: "정책서", state: "생성 중" },
    { id: "UF", label: "유저 플로우", disabled: true },
  ];

  it("탭마다 상태 배지를 함께 보인다", () => {
    render(<TabContent tabs={tabs} activeTabId="REQ" />);
    expect(query.getByText("승인")).toBeInTheDocument();
    expect(query.getByText("생성 중")).toBeInTheDocument();
  });

  it("아직 만들어지지 않은 문서는 누를 수 없고 '비어 있음'이다", () => {
    render(<TabContent tabs={tabs} />);
    expect(query.getByText("비어 있음")).toBeInTheDocument();
    expect(query.getByRole("tab", { name: /유저 플로우/ })).toBeDisabled();
  });

  it("고른 탭만 선택 표시가 된다", () => {
    render(<TabContent tabs={tabs} activeTabId="POL" />);
    expect(query.getByRole("tab", { name: /정책서/ })).toHaveAttribute("aria-selected", "true");
    expect(query.getByRole("tab", { name: /요구사항/ })).toHaveAttribute("aria-selected", "false");
  });

  it("탭을 누르면 onTabChange가 그 ID로 불린다", () => {
    const onTabChange = vi.fn();
    render(<TabContent tabs={tabs} onTabChange={onTabChange} />);
    fireEvent.click(query.getByRole("tab", { name: /정책서/ }));
    expect(onTabChange).toHaveBeenCalledWith("POL");
  });

  it("다섯 값 밖의 상태는 '알 수 없음'으로 가린다 (POL-005)", () => {
    expect(toneOf("승인")).toBe("success");
    expect(toneOf("검토 필요")).toBe("warning");
    expect(toneOf("생성 중")).toBe("info");
    expect(toneOf("대기")).toBe("neutral");
    expect(toneOf("이상한 값")).toBe("unknown");
    expect(toneOf(null)).toBe("unknown");
  });
});

describe("BLK-0003 버튼 그룹 — 바깥으로 나가는 링크", () => {
  it("주소가 있으면 새 탭으로 여는 링크 둘이다", () => {
    render(
      <ButtonGroup
        primaryAction="세션 열기"
        secondaryAction="저장소 열기"
        primaryHref="https://claude.ai"
        secondaryHref="https://github.com"
      />,
    );
    const links = query.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("target", "_blank");
    expect(links[0]).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
  });

  it("주소가 없으면 비활성이고 까닭을 적는다", () => {
    render(<ButtonGroup primaryAction="세션 열기" secondaryAction="저장소 열기" />);
    expect(query.queryByRole("link")).not.toBeInTheDocument();
    expect(query.getByText("연결할 곳이 없습니다")).toBeInTheDocument();
  });

  it("까닭을 바꿔 적을 수 있다", () => {
    render(<ButtonGroup primaryAction="PR 보기" disabledMessage="PR이 아직 열리지 않았습니다" />);
    expect(query.getByText("PR이 아직 열리지 않았습니다")).toBeInTheDocument();
  });

  it("보조 행동이 없으면 주 행동 하나만 둔다", () => {
    render(<ButtonGroup primaryAction="세션 열기" primaryHref="https://claude.ai" />);
    expect(query.getAllByRole("link")).toHaveLength(1);
  });
});

describe("BLK-0012 빈 상태", () => {
  it("그림 이름으로 아이콘을 고른다", () => {
    const { container, rerender } = render(<EmptyState illustration="첫 사용" title="t" />);
    const a = container.querySelector("img")?.getAttribute("src");
    rerender(<EmptyState illustration="변경 없음" title="t" />);
    const b = container.querySelector("img")?.getAttribute("src");
    expect(a).not.toBe(b);
  });

  it("모르는 그림 이름이어도 죽지 않는다", () => {
    const { container } = render(<EmptyState illustration="그런 그림 없음" title="t" />);
    expect(container.querySelector("img")).toBeInTheDocument();
  });

  it("제목과 설명을 보인다", () => {
    render(<EmptyState title="볼 수 있는 프로젝트가 없습니다" description="설명" />);
    expect(query.getByText("볼 수 있는 프로젝트가 없습니다")).toBeInTheDocument();
    expect(query.getByText("설명")).toBeInTheDocument();
  });

  it("나갈 곳이 없으면 누를 수 없는 버튼을 두지 않는다", () => {
    render(<EmptyState title="t" action="저장소 열기" />);
    expect(query.queryByRole("link")).not.toBeInTheDocument();
    expect(query.queryByRole("button")).not.toBeInTheDocument();
    expect(query.getByText("연결할 곳이 없습니다")).toBeInTheDocument();
  });
});

describe("RefList — BRQ-0008·0013·0015를 한 컴포넌트가 덮는다 (D-4)", () => {
  const groups = [
    { label: "상위 항목", items: [{ id: "REQ-001", title: "뷰어는 읽기만 한다" }] },
    {
      label: "하위 항목",
      items: [
        { id: "POL-004", title: "읽은 시점을 보인다" },
        { id: "FSD-031", broken: true, sub: "아직 만들어지지 않았거나 지워진 항목입니다" },
      ],
    },
  ];

  it("묶음마다 머리와 개수를 보인다", () => {
    render(<RefList groups={groups} />);
    expect(query.getByText("상위 항목")).toBeInTheDocument();
    expect(query.getByText("하위 항목")).toBeInTheDocument();
    expect(query.getByText("2")).toBeInTheDocument();
  });

  it("줄을 누르면 onSelect가 그 ID로 불린다", () => {
    const onSelect = vi.fn();
    render(<RefList groups={groups} onSelect={onSelect} />);
    fireEvent.click(query.getByText("뷰어는 읽기만 한다"));
    expect(onSelect).toHaveBeenCalledWith("REQ-001");
  });

  it("끊긴 참조는 누를 수 없다 (POL-011)", () => {
    const onSelect = vi.fn();
    const { container } = render(<RefList groups={groups} onSelect={onSelect} />);
    const broken = container.querySelector('[data-ref-id="FSD-031"]');
    expect(broken?.tagName).toBe("DIV"); // 버튼이 아니다
    fireEvent.click(broken!);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("끊긴 참조에는 화살표를 두지 않는다", () => {
    const { container } = render(<RefList groups={groups} />);
    const ok = container.querySelector('[data-ref-id="REQ-001"]');
    const broken = container.querySelector('[data-ref-id="FSD-031"]');
    expect(ok?.querySelectorAll("img").length).toBeGreaterThan(0);
    expect(broken?.querySelectorAll("img")).toHaveLength(0);
  });

  it("BRQ-0013은 상태 배지와 버전 범위를 더 보인다", () => {
    render(
      <RefList
        groups={[{ label: "라이브러리", items: [{ id: "BLK-0001", title: "헤더", state: "승인", meta: "^2" }] }]}
        showBlockStatus
        showVersionRange
      />,
    );
    expect(query.getByText("승인")).toBeInTheDocument();
    expect(query.getByText("^2")).toBeInTheDocument();
  });

  it("BRQ-0015는 줄마다 바깥 링크 둘을 단다", () => {
    render(
      <RefList
        groups={[{ items: [{ id: "REQ-001", title: "t", repoHref: "https://github.com", sessionHref: "https://claude.ai" }] }]}
        onOpenRepo={vi.fn()}
        onOpenSession={vi.fn()}
      />,
    );
    expect(query.getByText("GitHub")).toBeInTheDocument();
    expect(query.getByText("세션")).toBeInTheDocument();
  });

  it("묶음이 다 비면 emptyMessage를 보인다", () => {
    render(<RefList groups={[{ label: "상위", items: [] }]} emptyMessage="연결된 항목이 없습니다" />);
    expect(query.getByText("연결된 항목이 없습니다")).toBeInTheDocument();
  });

  it("이름 없는 배열도 묶음으로 받는다", () => {
    render(<RefList groups={[[{ id: "UF-001", title: "단계" }]]} />);
    expect(query.getByText("단계")).toBeInTheDocument();
  });
});

describe("BRQ-0012 영역 디스크립션·예외 패널", () => {
  it("sections·sectionLabels·emptyMessages가 자리로 짝지어진다", () => {
    render(
      <AreaDetailPanel
        sections={[["설명 한 줄"], []]}
        sectionLabels={["디스크립션", "예외"]}
        emptyMessages={["적힌 디스크립션이 없습니다", "적힌 예외가 없습니다"]}
      />,
    );
    expect(query.getByText("디스크립션")).toBeInTheDocument();
    expect(query.getByText("설명 한 줄")).toBeInTheDocument();
    expect(query.getByText("예외")).toBeInTheDocument();
    expect(query.getByText("적힌 예외가 없습니다")).toBeInTheDocument();
  });

  it("묶음마다 개수를 보인다", () => {
    render(
      <AreaDetailPanel sections={[["a", "b", "c"]]} sectionLabels={["디스크립션"]} />,
    );
    expect(query.getByText("3")).toBeInTheDocument();
  });
});

describe("BRQ-0010 내보내기 상태 줄", () => {
  it("네 상태마다 다르게 보인다", () => {
    for (const [status, title] of [
      ["idle", "아직 내보내지 않았습니다"],
      ["exporting", "내보내는 중"],
      ["done", "내보냈습니다"],
      ["failed", "내보내지 못했습니다"],
    ] as const) {
      const { unmount } = render(<ExportStatusBar status={status} />);
      expect(query.getByText(title)).toBeInTheDocument();
      unmount();
    }
  });

  it("화면 파일의 한글 상태 값도 받는다", () => {
    render(<ExportStatusBar status="실패" />);
    expect(query.getByText("내보내지 못했습니다")).toBeInTheDocument();
  });

  it("실패할 때만 다시 시도를 둔다", () => {
    const { rerender } = render(<ExportStatusBar status="done" retryLabel="다시 시도" />);
    expect(query.queryByText("다시 시도")).not.toBeInTheDocument();
    rerender(<ExportStatusBar status="failed" retryLabel="다시 시도" />);
    expect(query.getByText("다시 시도")).toBeInTheDocument();
  });

  it("다시 시도를 누르면 onRetry가 불린다", () => {
    const onRetry = vi.fn();
    render(<ExportStatusBar status="failed" onRetry={onRetry} />);
    fireEvent.click(query.getByText("다시 시도"));
    expect(onRetry).toHaveBeenCalled();
  });

  it("모르는 상태는 대기로 본다. 죽지 않는다", () => {
    render(<ExportStatusBar status="그런 상태 없음" />);
    expect(query.getByText("아직 내보내지 않았습니다")).toBeInTheDocument();
  });
});
