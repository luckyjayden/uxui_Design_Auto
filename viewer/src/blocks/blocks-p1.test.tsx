import { describe, expect, it, vi } from "vitest";
import { render, screen as query, fireEvent } from "@testing-library/react";
import { MetricSummary } from "./MetricSummary/MetricSummary";
import { ItemList } from "./ItemList/ItemList";
import { ProjectCardList } from "./ProjectCardList/ProjectCardList";
import { SummaryCard } from "./SummaryCard/SummaryCard";
import { StageProgress, behind } from "./StageProgress/StageProgress";
import { WaitingNotice } from "./WaitingNotice/WaitingNotice";
import { ChangeNotice } from "./ChangeNotice/ChangeNotice";
import { FlowDiagram } from "./FlowDiagram/FlowDiagram";

/* P1 블록 아홉이 설계와 디자인대로 도는지 본다. */

describe("BRQ-0002 요약 수치 — 센 값만 보인다", () => {
  it("값이 없는 칸은 만들어 채우지 않는다", () => {
    render(
      <MetricSummary
        metrics={[
          { label: "끝난 단계", value: 4 },
          { label: "비율", value: null },
          { label: "만들어진 문서", value: 11 },
        ]}
      />,
    );
    expect(query.getByText("4")).toBeInTheDocument();
    expect(query.getByText("11")).toBeInTheDocument();
    expect(query.queryByText("비율")).not.toBeInTheDocument();
  });

  it("columns만큼 칸을 나눈다", () => {
    const { container } = render(
      <MetricSummary metrics={[{ label: "a", value: 1 }]} columns={3} />,
    );
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.style.gridTemplateColumns).toContain("repeat(3");
  });

  it("셀 것이 없으면 안내를 보인다", () => {
    render(<MetricSummary metrics={[]} emptyMessage="셀 수 있는 것이 없습니다" />);
    expect(query.getByText("셀 수 있는 것이 없습니다")).toBeInTheDocument();
  });
});

describe("BRQ-0007·0014 목록 — 한 컴포넌트가 둘을 덮는다 (D-4)", () => {
  const items = [
    { id: "REQ-001", title: "뷰어는 읽기만 한다", origin: "ai" },
    { id: "REQ-002", title: "문서는 항목 단위로", origin: "human" },
    { id: "REQ-003", title: "출처 없음", origin: "그 밖" },
  ];

  it("showOrigin이면 ai는 'AI 생성', human은 '사람 수정'", () => {
    render(<ItemList items={items} showOrigin />);
    expect(query.getByText("AI 생성")).toBeInTheDocument();
    expect(query.getByText("사람 수정")).toBeInTheDocument();
  });

  it("출처 값이 ai도 human도 아니면 표시하지 않는다 (POL-009의 예외)", () => {
    render(<ItemList items={items} showOrigin />);
    expect(query.queryByText("그 밖")).not.toBeInTheDocument();
  });

  it("showOrigin이 거짓이면 출처를 아예 보이지 않는다", () => {
    render(<ItemList items={items} showOrigin={false} />);
    expect(query.queryByText("AI 생성")).not.toBeInTheDocument();
  });

  it("순서를 파일 그대로 두고 다시 정렬하지 않는다 (POL-009)", () => {
    const { container } = render(<ItemList items={items} />);
    const ids = [...container.querySelectorAll("[data-item-id]")].map((n) =>
      n.getAttribute("data-item-id"),
    );
    expect(ids).toEqual(["REQ-001", "REQ-002", "REQ-003"]);
  });

  it("BRQ-0014는 판정을 보인다. 통과·실패 둘뿐이다 (POL-018)", () => {
    render(
      <ItemList items={[{ id: "QA-01", title: "요구사항 반영", verdict: "통과" }]} showVerdict />,
    );
    expect(query.getByText("통과")).toBeInTheDocument();
  });
});

describe("BRQ-0001 프로젝트 카드 목록", () => {
  const items = [
    { id: "ux-ai-studio", name: "UX AI Studio", state: "검토 필요" },
    { id: "other", name: "다른 프로젝트", state: "대기" },
  ];

  it("keyword로 이미 읽어 둔 목록만 거른다", () => {
    render(<ProjectCardList items={items} keyword="ux" />);
    expect(query.getByText("UX AI Studio")).toBeInTheDocument();
    expect(query.queryByText("다른 프로젝트")).not.toBeInTheDocument();
  });

  it("거른 결과가 없으면 제목을 '검색 결과가 없습니다'로 바꾼다", () => {
    render(<ProjectCardList items={items} keyword="그런거없음" />);
    expect(query.getByText("검색 결과가 없습니다")).toBeInTheDocument();
  });

  it("아예 없을 때와 거른 결과가 없을 때를 가른다", () => {
    render(<ProjectCardList items={[]} emptyMessage="볼 수 있는 프로젝트가 없습니다" />);
    expect(query.getByText("볼 수 있는 프로젝트가 없습니다")).toBeInTheDocument();
  });

  it("일곱 단계 막대를 단계 수만큼 그린다", () => {
    const { container } = render(
      <ProjectCardList items={[{ id: "p", stages: ["승인", "승인", "검토 필요", null, null, null, null] }]} />,
    );
    const card = container.querySelector("[data-project-id]");
    expect(card?.querySelectorAll("span[class*='cell']")).toHaveLength(7);
  });
});

describe("BRQ-0004 단계 요약 카드", () => {
  it("승인·실행 버튼을 두지 않는다 (POL-002)", () => {
    render(
      <SummaryCard
        summary={{ title: "정보 구조도", files: ["projects/x/IA.md"] }}
        status="승인"
        links={[{ label: "GitHub에서 보기", href: "https://github.com" }]}
      />,
    );
    expect(query.queryByText(/승인하기|실행/)).not.toBeInTheDocument();
  });

  it("고른 것이 없으면 안내를 보인다", () => {
    render(<SummaryCard summary={null} emptyMessage="검증 결과가 없습니다" />);
    expect(query.getByText("검증 결과가 없습니다")).toBeInTheDocument();
  });

  it("바깥 링크의 주소가 없으면 비활성으로 둔다", () => {
    render(
      <SummaryCard summary={{ title: "t" }} links={[{ label: "GitHub에서 보기" }]} />,
    );
    expect(query.getByText("연결할 곳이 없습니다")).toBeInTheDocument();
  });

  it("만든 파일의 경로를 보인다", () => {
    render(<SummaryCard summary={{ title: "t", files: ["projects/x/IA.md"] }} />);
    expect(query.getByText("projects/x/IA.md")).toBeInTheDocument();
  });
});

describe("BRQ-0003 일곱 단계 — 뒤처진 쪽을 단계 상태로 (POL-006)", () => {
  it("POL-005의 차례에서 앞에 오는 쪽이 뒤처진 쪽이다", () => {
    expect(behind(["승인", "검토 필요"])).toBe("검토 필요");
    expect(behind(["검토 필요", "생성 중"])).toBe("생성 중");
    expect(behind(["생성 중", "수정 필요"])).toBe("수정 필요");
    expect(behind(["수정 필요", "대기"])).toBe("대기");
    expect(behind(["승인", "승인"])).toBe("승인");
  });

  it("'알 수 없음'이 섞이면 차례에 두지 않는다 (POL-005)", () => {
    expect(behind(["승인", "이상한 값"])).toBe("이상한 값");
  });

  it("플로우 단계는 두 문서를 한 칸으로 묶고 뒤처진 쪽을 보인다", () => {
    render(
      <StageProgress
        steps={[
          {
            id: "flow",
            name: "유저·워크 플로우",
            docs: [
              { id: "UF", name: "유저 플로우", state: "승인" },
              { id: "WF", name: "워크 플로우", state: "검토 필요" },
            ],
          },
        ]}
      />,
    );
    expect(query.getByText("검토 필요")).toBeInTheDocument();
    expect(query.queryByText("승인")).not.toBeInTheDocument();
  });

  it("펼치면 문서마다 상태를 따로 보인다", () => {
    render(
      <StageProgress
        expandedId="flow"
        steps={[
          {
            id: "flow",
            name: "유저·워크 플로우",
            docs: [
              { id: "UF", name: "유저 플로우", state: "승인" },
              { id: "WF", name: "워크 플로우", state: "검토 필요" },
            ],
          },
        ]}
      />,
    );
    expect(query.getByText("유저 플로우")).toBeInTheDocument();
    expect(query.getByText("승인")).toBeInTheDocument();
  });

  it("사람의 확정을 기다리면 '사람 확인 대기'를 보인다", () => {
    render(<StageProgress steps={[{ id: "a", name: "정책서", state: "검토 필요", waiting: true }]} />);
    expect(query.getByText("사람 확인 대기")).toBeInTheDocument();
  });
});

describe("BRQ-0005 대기 알림 줄 — BRQ-0006과 구현을 공유하지 않는다", () => {
  it("기다리는 일이 없으면 줄 자체를 보이지 않는다", () => {
    const { container } = render(<WaitingNotice />);
    expect(container).toBeEmptyDOMElement();
  });

  it("승인 버튼을 두지 않는다. 바깥으로 나가는 링크만 둔다 (POL-002)", () => {
    render(
      <WaitingNotice
        title="정보 구조도의 승인을 기다립니다"
        actionLabel="PR 열기"
        actionHref="https://github.com/x/pull/9"
      />,
    );
    const link = query.getByText("PR 열기").closest("a");
    expect(link).toHaveAttribute("target", "_blank");
    expect(query.queryByRole("button", { name: /승인/ })).not.toBeInTheDocument();
  });

  it("여럿이면 하나를 머리로 두고 나머지는 펼쳐 본다", () => {
    const onExpand = vi.fn();
    render(
      <WaitingNotice
        title="머리"
        expandable
        others={[{ title: "나머지 하나" }]}
        onExpand={onExpand}
      />,
    );
    expect(query.queryByText("나머지 하나")).not.toBeInTheDocument();
    fireEvent.click(query.getByText(/1건 더/));
    expect(onExpand).toHaveBeenCalledWith(true);
  });
});

describe("BRQ-0006 변경 영향 알림 줄", () => {
  it("변경이 없으면 줄을 감추지 않고 흐리게 둔다", () => {
    render(<ChangeNotice disabled actionLabel="변경 영향 보기" />);
    expect(query.getByText("변경이 없습니다")).toBeInTheDocument();
    expect(query.getByText("변경 영향 보기").closest("button")).toBeDisabled();
  });

  it("변경이 있으면 누를 수 있다", () => {
    const onAction = vi.fn();
    render(
      <ChangeNotice
        title="승인된 항목이 바뀌었습니다"
        actionLabel="변경 영향 보기"
        onAction={onAction}
      />,
    );
    fireEvent.click(query.getByText("변경 영향 보기"));
    expect(onAction).toHaveBeenCalled();
  });
});

describe("BRQ-0009 플로우 다이어그램", () => {
  const nodes = [
    { id: "UF-001", title: "목록 열기", type: "진입" },
    { id: "UF-003", title: "프로젝트가 있는가", type: "분기" },
    { id: "UF-004", title: "진행 현황", type: "선택" },
    { id: "UF-005", title: "빈 상태", type: "이탈" },
  ];
  const edges = [
    { from: "UF-001", to: "UF-003" },
    { from: "UF-003", to: "UF-004", condition: "있음", policy: "POL-005" },
    { from: "UF-003", to: "UF-005", condition: "없음" },
  ];

  it("플로우 JSON 그대로 노드를 그린다. 더하거나 빼지 않는다", () => {
    const { container } = render(<FlowDiagram nodes={nodes} edges={edges} />);
    expect(container.querySelectorAll("[data-node-id]")).toHaveLength(4);
  });

  it("유형을 색만이 아니라 글자로도 적는다", () => {
    render(<FlowDiagram nodes={nodes} edges={edges} />);
    expect(query.getByText("진입")).toBeInTheDocument();
    expect(query.getByText("분기")).toBeInTheDocument();
    expect(query.getByText("이탈")).toBeInTheDocument();
  });

  it("정책이 없는 분기는 '정책 없음'으로 구분한다 (QA-03)", () => {
    render(<FlowDiagram nodes={nodes} edges={edges} showBranchCondition />);
    expect(query.getByText("POL-005")).toBeInTheDocument();
    expect(query.getByText("정책 없음")).toBeInTheDocument();
  });

  it("정책 없는 분기의 선은 빨간 점선이다", () => {
    const { container } = render(<FlowDiagram nodes={nodes} edges={edges} />);
    const broken = container.querySelectorAll("path[class*='edgeBroken']");
    expect(broken).toHaveLength(1);
  });

  it("순환이 있어도 멈춘다", () => {
    const cyc = [
      { id: "A", type: "선택" },
      { id: "B", type: "선택" },
    ];
    const { container } = render(
      <FlowDiagram nodes={cyc} edges={[{ from: "A", to: "B" }, { from: "B", to: "A" }]} />,
    );
    expect(container.querySelectorAll("[data-node-id]")).toHaveLength(2);
  });

  it("비어 있으면 안내를 보인다", () => {
    render(<FlowDiagram nodes={[]} emptyMessage="비어 있음" />);
    expect(query.getByText("비어 있음")).toBeInTheDocument();
  });
});
