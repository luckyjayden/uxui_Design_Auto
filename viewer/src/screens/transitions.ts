import type { Area } from "../data/load";
import { STAGES, type UiState } from "../data/screenState";

/* 화면 사이의 이동을 라우팅으로 거는 자리다. 파이프라인 v2의 08이 맡는다.
 *
 * **길은 `ia.json`이 정한다.** 여기서 길을 새로 내지 않는다. `HOPS`가 그
 * `transitions`를 그대로 옮긴 표이고, 같은 폴더의 시험이 저장소의 것과
 * 글자까지 맞대어 본다. 저장소에 없는 길이 표에 있으면 시험이 깨진다.
 *
 * 한 화면에서 같은 곳으로 가는 줄이 둘이면 **두 길이다.** `trigger`가 다르면
 * 누르는 자리가 다르다는 뜻이고 둘 다 걸려야 한다(SCR-006 → SCR-002가 그렇다).
 *
 * 블록은 고치지 않는다. 블록이 이미 내놓은 콜백 자리(`onBack`, `onSelect`,
 * `onAction`, `links`)에 옮겨 가는 일을 끼워 넣을 뿐이다. */

/* ---------------------------------------------------------------- 주소 */

/** 그 화면의 주소. 뷰어의 입구(SCR-001)만 화면 ID가 주소에 없다. */
export function pathTo(projectId: string, screenId: string): string {
  return screenId === "SCR-001" ? `/${projectId}` : `/${projectId}/${screenId}`;
}

/* ---------------------------------------------------------------- 길의 표 */

/** 걸어 둔 길 하나. `ia.json`의 한 줄에 '어디를 누르는가'를 더한 것이다. */
export interface Hop {
  from: string;
  to: string;
  /** `ia.json`에 적힌 그대로. */
  trigger: string;
  /** 그 방아쇠가 달린 영역. */
  area: string;
  /** 그 영역의 어느 prop이 방아쇠인가. */
  prop: string;
}

export const HOPS: Hop[] = [
  { from: "SCR-001", to: "SCR-002", trigger: "프로젝트 카드를 누른다",
    area: "SCR-001-A02", prop: "onSelect" },

  { from: "SCR-002", to: "SCR-001", trigger: "상단의 프로젝트 이름을 눌러 목록으로 돌아간다",
    area: "SCR-002-A01", prop: "onBack" },
  { from: "SCR-002", to: "SCR-003", trigger: "요구사항·정책·정보 구조도 같은 문서 단계 카드의 '문서 보기'를 누른다",
    area: "SCR-002-A05", prop: "links" },
  { from: "SCR-002", to: "SCR-004", trigger: "플로우 단계 카드를 누른다",
    area: "SCR-002-A05", prop: "links" },
  { from: "SCR-002", to: "SCR-005", trigger: "화면설계서 단계 카드를 누른다",
    area: "SCR-002-A05", prop: "links" },
  { from: "SCR-002", to: "SCR-006", trigger: "검증 단계 카드를 누른다",
    area: "SCR-002-A05", prop: "links" },
  { from: "SCR-002", to: "SCR-007", trigger: "변경 영향 알림을 누른다",
    area: "SCR-002-A07", prop: "onAction" },

  { from: "SCR-003", to: "SCR-004", trigger: "참조 패널의 유저 플로우·워크 플로우 항목을 누른다",
    area: "SCR-003-A04", prop: "onSelect" },
  { from: "SCR-003", to: "SCR-005", trigger: "참조 패널의 화면(SCR) 항목을 누른다",
    area: "SCR-003-A04", prop: "onSelect" },
  { from: "SCR-003", to: "SCR-002", trigger: "헤더의 뒤로가기를 눌러 진행 현황으로 돌아간다",
    area: "SCR-003-A01", prop: "onBack" },

  { from: "SCR-004", to: "SCR-003", trigger: "분기에 걸린 정책 ID를 누른다",
    area: "SCR-004-A04", prop: "onSelect" },
  { from: "SCR-004", to: "SCR-002", trigger: "헤더의 뒤로가기를 눌러 진행 현황으로 돌아간다",
    area: "SCR-004-A01", prop: "onBack" },

  { from: "SCR-005", to: "SCR-003", trigger: "영역에 걸린 정책·요구사항 ID를 누른다",
    area: "SCR-005-A05", prop: "onSelect" },
  { from: "SCR-005", to: "SCR-002", trigger: "헤더의 뒤로가기를 눌러 진행 현황으로 돌아간다",
    area: "SCR-005-A01", prop: "onBack" },

  { from: "SCR-006", to: "SCR-003", trigger: "실패 항목의 문서 항목 ID를 누른다",
    area: "SCR-006-A05", prop: "onSelect" },
  { from: "SCR-006", to: "SCR-005", trigger: "실패 항목의 화면 ID를 누른다",
    area: "SCR-006-A05", prop: "onSelect" },
  { from: "SCR-006", to: "SCR-007", trigger: "변경 영향 보기를 누른다",
    area: "SCR-006-A08", prop: "onAction" },
  // 같은 곳으로 가지만 누르는 자리가 다른 두 길이다. 아래는 빈 상태(A07)가
  // 돌려보내는 길이고 그다음은 사람이 머리를 눌러 떠나는 길이다(UF-025 / UF-042).
  { from: "SCR-006", to: "SCR-002", trigger: "검증 결과가 없어 진행 현황으로 돌아간다",
    area: "SCR-006-A07", prop: "onAction" },
  { from: "SCR-006", to: "SCR-002", trigger: "헤더의 뒤로가기를 눌러 진행 현황으로 돌아간다",
    area: "SCR-006-A01", prop: "onBack" },

  { from: "SCR-007", to: "SCR-003", trigger: "영향받는 항목의 ID를 누른다",
    area: "SCR-007-A04", prop: "onSelect" },
  { from: "SCR-007", to: "SCR-002", trigger: "헤더의 뒤로가기를 눌러 진행 현황으로 돌아간다",
    area: "SCR-007-A01", prop: "onBack" },
];

/* ---------------------------------------------------------------- ID로 갈 곳 */

const DOC_CODES = ["REQ", "POL", "UF", "WF", "IA", "SB", "QA"];

/** 문서 코드 → 그 문서를 읽는 화면. SCR-002-A05의 디스크립션 2번이 정한 것이다. */
const SCREEN_OF_DOC: Record<string, string> = {
  REQ: "SCR-003",
  POL: "SCR-003",
  IA: "SCR-003",
  UF: "SCR-004",
  WF: "SCR-004",
  SB: "SCR-005",
  QA: "SCR-006",
};

/** 항목 ID나 문서 코드에서 문서 코드를 읽어 낸다. 아니면 null. */
export function docCodeOf(id: string): string | null {
  if (DOC_CODES.includes(id)) return id;
  const head = /^([A-Z]+)-/.exec(id);
  return head && DOC_CODES.includes(head[1]) ? head[1] : null;
}

/** 어떤 ID를 눌렀을 때 갈 곳과 들고 갈 것. 갈 곳이 없으면 null이다(POL-011). */
export function targetOf(id: string): { to: string; carry: UiState } | null {
  // 화면과 화면 영역. `SCR-005-A03`이면 그 영역을 고른 채로 연다.
  if (id.startsWith("SCR-")) {
    return {
      to: "SCR-005",
      carry: { screenId: id.slice(0, 7), selectedAreaId: id.length > 7 ? id : null },
    };
  }
  // 작업 단위는 화면설계서 뷰어로 보낸다. 작업 단위 하나를 여는 화면은 없다.
  if (id.startsWith("WU-")) return { to: "SCR-005", carry: {} };

  const code = docCodeOf(id);
  if (!code) return null;
  const to = SCREEN_OF_DOC[code];
  // 항목이 아니라 문서 코드 자체면(검증의 targets가 그렇다) 문서만 연다.
  const whole = id === code;

  if (to === "SCR-003") {
    return { to, carry: whole ? { docCode: code } : { docCode: code, selectedItemId: id } };
  }
  if (to === "SCR-004") {
    return {
      to,
      carry: { flowKind: code === "UF" ? "user" : "work", selectedNodeId: whole ? null : id },
    };
  }
  if (to === "SCR-006") {
    return { to, carry: whole ? {} : { selectedRuleId: id } };
  }
  return { to, carry: {} };
}

/* ---------------------------------------------------------------- 거는 자리 */

/** 지금 보고 있는 화면이 옮겨 갈 때 쓰는 것들. */
export interface NavContext {
  projectId: string;
  screenId: string;
  /** 사람이 고른 것. '문서 보기'가 어느 단계의 것인지 여기서 본다. */
  ui: UiState;
  /** 다른 화면으로 간다. `carry`는 닿는 화면이 처음부터 들고 있을 값이다. */
  go: (to: string, carry?: UiState, projectId?: string) => void;
  /** 같은 화면 안에서 고른 것을 바꾼다. */
  set: (patch: UiState) => void;
}

/** ID를 따라간다. 갈 곳이 지금 화면이면 떠나지 않고 고른 것만 바꾼다. */
function follow(c: NavContext, id: string) {
  const t = targetOf(id);
  if (!t) return; // 갈 곳을 만들어 내지 않는다
  if (t.to === c.screenId) {
    c.set(t.carry);
    return;
  }
  c.go(t.to, t.carry);
}

/** SCR-002-A05의 '문서 보기'. 어느 화면으로 갈지는 그 단계의 문서 코드가 정한다. */
function docLink(c: NavContext) {
  const stage = STAGES.find((s) => s.id === c.ui.selectedStage);
  const code = stage?.docs[0];
  // 고른 단계가 없거나 읽을 문서가 없는 단계(프로젝트 정의서)면 링크를 두지 않는다.
  if (!code) return [];
  const to = SCREEN_OF_DOC[code];
  const carry: UiState =
    to === "SCR-003"
      ? { docCode: code }
      : to === "SCR-004"
        ? { flowKind: code === "UF" ? "user" : "work" }
        : {};
  return [{ label: "문서 보기", internal: true, onClick: () => c.go(to, carry) }];
}

/** 영역 ID → 그 영역에 덧씌울 props. 여기에 없는 영역은 아무것도 덧씌우지 않는다. */
const WIRING: Record<string, (c: NavContext) => Record<string, unknown>> = {
  "SCR-001-A02": (c) => ({
    // 카드의 프로젝트가 곧 다음 주소의 프로젝트다.
    onSelect: (id: string) => {
      c.set({ selectedProjectId: id });
      c.go("SCR-002", {}, id);
    },
  }),

  "SCR-002-A01": (c) => ({ onBack: () => c.go("SCR-001") }),
  "SCR-002-A05": (c) => ({ links: docLink(c) }),
  "SCR-002-A07": (c) => ({ onAction: () => c.go("SCR-007") }),

  "SCR-003-A01": (c) => ({ onBack: () => c.go("SCR-002") }),
  "SCR-003-A04": (c) => ({ onSelect: (id: string) => follow(c, id) }),

  "SCR-004-A01": (c) => ({ onBack: () => c.go("SCR-002") }),
  "SCR-004-A04": (c) => ({ onSelect: (id: string) => follow(c, id) }),

  "SCR-005-A01": (c) => ({ onBack: () => c.go("SCR-002") }),
  "SCR-005-A05": (c) => ({ onSelect: (id: string) => follow(c, id) }),

  "SCR-006-A01": (c) => ({ onBack: () => c.go("SCR-002") }),
  "SCR-006-A05": (c) => ({ onSelect: (id: string) => follow(c, id) }),
  "SCR-006-A07": (c) => ({ onAction: () => c.go("SCR-002") }),
  "SCR-006-A08": (c) => ({ onAction: () => c.go("SCR-007") }),

  "SCR-007-A01": (c) => ({ onBack: () => c.go("SCR-002") }),
  "SCR-007-A04": (c) => ({ onSelect: (id: string) => follow(c, id) }),
};

/** 그 영역에 덧씌울 props. 걸린 길이 없으면 undefined. */
export function wire(area: Area, c: NavContext): Record<string, unknown> | undefined {
  return WIRING[area.id]?.(c);
}

/** 길이 걸린 영역 ID 전부. render.json을 사람이 대조할 때 쓴다. */
export function wiredAreas(): string[] {
  return Object.keys(WIRING).sort();
}
