import { describe, expect, it, vi } from "vitest";
import { readsKeys, resolveProps } from "./resolveProps";

/* 데이터 규격 4절의 props 표기를 그대로 구현했는지 본다.
 * 화면설계서 11절이 넘긴 배열 둘도 여기서 받는다. */

const state = {
  screenAreas: ["a", "b"],
  selectedAreaId: null,
  parentRefs: [1],
  childRefs: [2],
};

describe("resolveProps — state 키와 글자 그대로를 가른다", () => {
  it("state 키면 그 값으로 푼다", () => {
    expect(resolveProps({ areas: "screenAreas" }, state).areas).toEqual(["a", "b"]);
  });

  it("state에 없는 문자열은 글자 그대로 둔다", () => {
    expect(resolveProps({ emptyMessage: "영역이 없습니다" }, state).emptyMessage).toBe(
      "영역이 없습니다",
    );
  });

  it("state 키의 배열을 푼다 (BRQ-0008의 groups)", () => {
    expect(resolveProps({ groups: ["parentRefs", "childRefs"] }, state).groups).toEqual([
      [1],
      [2],
    ]);
  });

  it("글자 그대로의 배열은 그대로 둔다 (BRQ-0012의 sectionLabels)", () => {
    expect(
      resolveProps({ sectionLabels: ["디스크립션", "예외"] }, state).sectionLabels,
    ).toEqual(["디스크립션", "예외"]);
  });

  it("값이 null이어도 state 키면 푼다", () => {
    expect(resolveProps({ selectedAreaId: "selectedAreaId" }, state)).toHaveProperty(
      "selectedAreaId",
      null,
    );
  });

  it("boolean 같은 것은 그대로 둔다", () => {
    expect(resolveProps({ showOrigin: false }, state).showOrigin).toBe(false);
  });
});

describe("resolveProps — on*은 그 키를 바꾸는 콜백이 된다", () => {
  it("state 키를 가리키는 on*은 setter가 된다", () => {
    const set = vi.fn();
    const out = resolveProps({ onSelectArea: "selectedAreaId" }, state, set);
    (out.onSelectArea as (v: unknown) => void)("SCR-001-A02");
    expect(set).toHaveBeenCalledWith("selectedAreaId", "SCR-001-A02");
  });

  it("set을 안 주면 콜백을 만들지 않는다", () => {
    expect(resolveProps({ onSelectArea: "selectedAreaId" }, state).onSelectArea).toBeUndefined();
  });

  it("state 키가 아닌 on*은 글자 그대로 둔다", () => {
    expect(resolveProps({ onAction: "열기" }, state).onAction).toBe("열기");
  });
});

describe("readsKeys — 그 영역이 어떤 state를 읽는지", () => {
  it("읽는 키만 모으고 콜백은 세지 않는다", () => {
    expect(
      readsKeys({ areas: "screenAreas", groups: ["parentRefs"], onSelect: "selectedAreaId" }, state),
    ).toEqual(["parentRefs", "screenAreas"]);
  });
});
