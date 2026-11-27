import { describe, expect, it } from "vitest";
import { render, screen as query, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { ScreenView } from "./ScreenView";
import { HOPS, docCodeOf, pathTo, targetOf, wiredAreas } from "./transitions";
import { screen as loadScreen, screenIds, transitions } from "../data/load";

/* 08의 완료 조건이다.
 *
 *   "ia.json의 이동 21건이 라우팅으로 걸려 있는가. 그 trigger를 눌러 그 화면으로
 *    가는 길이 코드에 있는가"
 *
 * 앞의 묶음은 **표가 저장소와 같은지**를, 뒤의 묶음은 **눌러서 정말 가는지**를 본다.
 * 표만 맞고 눌러지지 않으면 render.json이 거짓이 된다. */

const P = "ux-ai-studio";

/* ---------------------------------------------------------------- 표 */

describe("HOPS — ia.json에 적힌 길과 글자까지 같다", () => {
  const repo = transitions(P);

  it("수가 같다", () => {
    expect(HOPS).toHaveLength(repo.length);
    expect(repo).toHaveLength(21);
  });

  it("저장소의 줄이 하나도 빠지지 않는다", () => {
    const wired = new Set(HOPS.map((h) => `${h.from}|${h.to}|${h.trigger}`));
    for (const t of repo) {
      expect(wired.has(`${t.from}|${t.to}|${t.trigger}`)).toBe(true);
    }
  });

  it("저장소에 없는 길을 만들어 두지 않는다", () => {
    const known = new Set(repo.map((t) => `${t.from}|${t.to}|${t.trigger}`));
    for (const h of HOPS) {
      expect(known.has(`${h.from}|${h.to}|${h.trigger}`)).toBe(true);
    }
  });

  it("같은 곳으로 가도 trigger가 다르면 두 길이다", () => {
    const back = HOPS.filter((h) => h.from === "SCR-006" && h.to === "SCR-002");
    expect(back).toHaveLength(2);
    expect(new Set(back.map((h) => h.area)).size).toBe(2);
  });

  it("방아쇠가 달린 영역이 그 화면에 실제로 있다", () => {
    for (const h of HOPS) {
      const areas = loadScreen(P, h.from)!.areas.map((a) => a.id);
      expect(areas).toContain(h.area);
    }
  });

  it("길이 걸린 영역은 모두 HOPS에 적힌 영역이다", () => {
    const inTable = new Set(HOPS.map((h) => h.area));
    for (const id of wiredAreas()) expect(inTable.has(id)).toBe(true);
  });
});

describe("pathTo — 라우터가 잡은 경로와 같다", () => {
  it("입구만 화면 ID가 주소에 없다", () => {
    expect(pathTo(P, "SCR-001")).toBe(`/${P}`);
    expect(pathTo(P, "SCR-005")).toBe(`/${P}/SCR-005`);
  });

  it("화면 일곱 장이 모두 주소를 갖는다", () => {
    for (const id of screenIds(P)) expect(pathTo(P, id)).toContain(P);
  });
});

/* ---------------------------------------------------------------- ID로 갈 곳 */

describe("targetOf — ID의 종류가 갈 곳을 정한다", () => {
  it("문서 항목은 문서 보기로", () => {
    expect(targetOf("REQ-001")).toEqual({
      to: "SCR-003",
      carry: { docCode: "REQ", selectedItemId: "REQ-001" },
    });
  });

  it("플로우 단계는 플로우 미리보기로", () => {
    expect(targetOf("UF-012")?.to).toBe("SCR-004");
    expect(targetOf("WF-012")?.carry).toMatchObject({ flowKind: "work" });
  });

  it("화면 ID는 화면설계서 뷰어로, 영역 ID면 그 영역을 고른 채로", () => {
    expect(targetOf("SCR-005")).toEqual({
      to: "SCR-005",
      carry: { screenId: "SCR-005", selectedAreaId: null },
    });
    expect(targetOf("SCR-005-A03")?.carry).toEqual({
      screenId: "SCR-005",
      selectedAreaId: "SCR-005-A03",
    });
  });

  it("검증이 문서 코드만 가리키면 그 문서를 연다", () => {
    expect(docCodeOf("POL")).toBe("POL");
    expect(targetOf("POL")).toEqual({ to: "SCR-003", carry: { docCode: "POL" } });
  });

  it("갈 곳이 없는 ID는 길을 만들어 내지 않는다", () => {
    expect(targetOf("BRQ-0008")).toBeNull();
    expect(docCodeOf("BLK-0001")).toBeNull();
  });
});

/* ---------------------------------------------------------------- 눌러 본다 */

function Where() {
  const loc = useLocation();
  return <output data-testid="where">{loc.pathname}</output>;
}

/** 그 화면을 열고 주소를 지켜본다. 돌아온 값으로 지금 주소를 읽는다. */
function open(screenId: string) {
  const start = pathTo(P, screenId);
  const view = render(
    <MemoryRouter initialEntries={[start]}>
      <Where />
      <Routes>
        <Route path=":projectId" element={<ScreenView screenId="SCR-001" />} />
        {screenIds(P).map((id) => (
          <Route key={id} path={`:projectId/${id}`} element={<ScreenView screenId={id} />} />
        ))}
      </Routes>
    </MemoryRouter>,
  );
  return {
    ...view,
    at: () => query.getByTestId("where").textContent,
    /** 그 영역 안에서만 찾는다. 같은 ID가 다른 영역에도 보이기 때문이다. */
    area: (areaId: string) =>
      within(view.container.querySelector(`[data-area-id="${areaId}"]`) as HTMLElement),
  };
}

describe("걸린 길을 눌러 본다 — 화면이 실제로 바뀐다", () => {
  it("SCR-001: 프로젝트 카드를 누르면 진행 현황으로 간다", () => {
    const v = open("SCR-001");
    fireEvent.click(v.container.querySelector(`[data-project-id="${P}"]`)!);
    expect(v.at()).toBe(`/${P}/SCR-002`);
  });

  it("SCR-002: 머리의 뒤로가기로 목록으로 돌아간다", () => {
    const v = open("SCR-002");
    fireEvent.click(query.getAllByLabelText("뒤로가기")[0]);
    expect(v.at()).toBe(`/${P}`);
  });

  it("SCR-002: 단계를 고르고 '문서 보기'를 누르면 그 문서의 화면으로 간다", () => {
    const v = open("SCR-002");
    fireEvent.click(query.getByText("정책서"));
    fireEvent.click(query.getByText("문서 보기"));
    expect(v.at()).toBe(`/${P}/SCR-003`);
  });

  it("SCR-002: 플로우 단계를 고르면 '문서 보기'가 플로우 미리보기로 간다", () => {
    const v = open("SCR-002");
    fireEvent.click(query.getByText("유저·워크 플로우"));
    fireEvent.click(query.getByText("문서 보기"));
    expect(v.at()).toBe(`/${P}/SCR-004`);
  });

  it("SCR-002: 화면설계서 단계는 화면설계서 뷰어로", () => {
    const v = open("SCR-002");
    fireEvent.click(query.getByText("화면설계서"));
    fireEvent.click(query.getByText("문서 보기"));
    expect(v.at()).toBe(`/${P}/SCR-005`);
  });

  it("SCR-002: 검증 단계는 검증 결과로", () => {
    const v = open("SCR-002");
    fireEvent.click(query.getAllByText("검증")[0]);
    fireEvent.click(query.getByText("문서 보기"));
    expect(v.at()).toBe(`/${P}/SCR-006`);
  });

  it("SCR-002: 읽을 문서가 없는 단계에는 '문서 보기'를 두지 않는다", () => {
    open("SCR-002");
    fireEvent.click(query.getByText("프로젝트 정의서"));
    expect(query.queryByText("문서 보기")).not.toBeInTheDocument();
  });

  it("SCR-003: 참조 패널의 화면(SCR) 항목을 누르면 화면설계서 뷰어로 간다", () => {
    const v = open("SCR-003");
    // REQ 항목 하나를 고르면 그것을 가리키는 하위 항목이 참조 패널에 나온다.
    fireEvent.click(v.area("SCR-003-A03").getByText("프로젝트 목록 조회"));
    fireEvent.click(v.area("SCR-003-A04").getByText("SCR-001"));
    expect(v.at()).toBe(`/${P}/SCR-005`);
  });

  it("SCR-003: 머리의 뒤로가기로 진행 현황으로 돌아간다", () => {
    const v = open("SCR-003");
    fireEvent.click(query.getAllByLabelText("뒤로가기")[0]);
    expect(v.at()).toBe(`/${P}/SCR-002`);
  });

  it("SCR-004: 분기에 걸린 정책 ID를 누르면 그 정책 항목으로 간다", () => {
    const v = open("SCR-004");
    fireEvent.click(v.area("SCR-004-A04").getAllByText("POL-008")[0]);
    expect(v.at()).toBe(`/${P}/SCR-003`);
  });

  it("SCR-004: 머리의 뒤로가기로 진행 현황으로 돌아간다", () => {
    const v = open("SCR-004");
    fireEvent.click(query.getAllByLabelText("뒤로가기")[0]);
    expect(v.at()).toBe(`/${P}/SCR-002`);
  });

  it("SCR-005: 영역에 걸린 정책·요구사항 ID를 누르면 문서 보기로 간다", () => {
    const v = open("SCR-005");
    // 영역을 하나 고르면 A05에 그 영역의 요구사항·정책이 나온다.
    fireEvent.click(v.area("SCR-005-A03").getByText("프로젝트 카드 목록"));
    fireEvent.click(v.area("SCR-005-A05").getAllByText("POL-008")[0]);
    expect(v.at()).toBe(`/${P}/SCR-003`);
  });

  it("SCR-005: 머리의 뒤로가기로 진행 현황으로 돌아간다", () => {
    const v = open("SCR-005");
    fireEvent.click(query.getAllByLabelText("뒤로가기")[0]);
    expect(v.at()).toBe(`/${P}/SCR-002`);
  });

  it("SCR-006: 실패 항목의 문서 항목 ID를 누르면 문서 보기로 간다", () => {
    const v = open("SCR-006");
    fireEvent.click(v.area("SCR-006-A05").getAllByText("POL")[0]);
    expect(v.at()).toBe(`/${P}/SCR-003`);
  });

  it("SCR-006: 실패 항목의 화면·작업 단위 ID를 누르면 화면설계서 뷰어로 간다", () => {
    const v = open("SCR-006");
    fireEvent.click(v.area("SCR-006-A05").getAllByText("WU-001")[0]);
    expect(v.at()).toBe(`/${P}/SCR-005`);
  });

  it("SCR-006: '변경 영향 보기'를 누르면 변경 영향으로 간다", () => {
    const v = open("SCR-006");
    fireEvent.click(query.getByText("변경 영향 보기"));
    expect(v.at()).toBe(`/${P}/SCR-007`);
  });

  it("SCR-006: 머리의 뒤로가기로 진행 현황으로 돌아간다", () => {
    const v = open("SCR-006");
    fireEvent.click(query.getAllByLabelText("뒤로가기")[0]);
    expect(v.at()).toBe(`/${P}/SCR-002`);
  });

  it("SCR-007: 머리의 뒤로가기로 진행 현황으로 돌아간다", () => {
    const v = open("SCR-007");
    fireEvent.click(query.getAllByLabelText("뒤로가기")[0]);
    expect(v.at()).toBe(`/${P}/SCR-002`);
  });
});

describe("미리보기는 길을 걸지 않는다", () => {
  it("SCR-005 안의 와이어프레임에서 영역을 골라도 화면이 바뀌지 않는다", () => {
    const v = open("SCR-005");
    // 안쪽이 그리는 것은 '설계'이지 사람이 쓰는 화면이 아니다. 영역을 고르면
    // 그 영역의 디스크립션이 옆에 설 뿐이고 뷰어는 그 자리에 그대로 있다.
    fireEvent.click(v.area("SCR-005-A03").getByText("프로젝트 카드 목록"));
    expect(v.at()).toBe(`/${P}/SCR-005`);
  });

  it("미리보기 안의 블록에는 옮겨 가는 길이 걸리지 않는다", () => {
    const v = open("SCR-005");
    const inner = v.container.querySelector('[data-area-id="SCR-005-A03"]')!;
    // 바깥 SCR-001-A02는 누르면 진행 현황으로 가지만, 미리보기 안의 같은
    // 영역에는 그 길이 없다. 미리보기의 previewState는 화면 파일의 초기값이다.
    expect(inner.querySelector(`[data-project-id]`)).toBeNull();
  });
});
