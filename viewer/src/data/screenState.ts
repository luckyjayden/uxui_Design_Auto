import {
  READ_AT,
  items as docItems,
  read,
  screen,
  screenIds,
  status,
  type DocCode,
  type Item,
  type StatusRow,
} from "./load";

/* 화면 파일의 `state` 키를 저장소 데이터로 채운다.
 *
 * 화면설계서는 `state`에 **초기값만** 적는다(`[]`, `null`, `"대기"`). 그 자리에
 * 무엇이 들어오는지는 영역의 디스크립션과 인터랙션이 말한다. 이 파일이 그
 * 둘을 읽어 실제 값으로 바꾼다. 파이프라인 v2의 08 Wireframe Rendering이다.
 *
 * **뷰어가 값을 만들어 내지 않는다**(POL-004). 저장소에서 읽은 것만 넣고,
 * 없으면 빈 채로 둔다. 판정도 다시 매기지 않는다(POL-019).
 *
 * 고른 것(`selected*`)은 사람이 누른 결과라 바깥에서 받는다. 그에 딸린
 * 값(고른 항목의 참조, 고른 규칙의 상세 …)은 여기서 끌어낸다. */

/** 사람이 고른 것. 화면이 쥐고 있다가 넘긴다. */
export interface UiState {
  keyword?: string;
  selectedProjectId?: string | null;
  selectedStage?: string | null;
  expandedStage?: string | null;
  expandedNotice?: boolean;
  docCode?: string;
  selectedItemId?: string | null;
  flowKind?: string;
  selectedNodeId?: string | null;
  screenId?: string | null;
  selectedAreaId?: string | null;
  previewState?: Record<string, unknown>;
  selectedRuleId?: string | null;
  selectedChangeId?: string | null;
  exportState?: string;
  repoReadAt?: string | null;
}

type State = Record<string, unknown>;

/* ---------------------------------------------------------------- 공통 */

/** 일곱 단계. 순서는 고정이다(BRQ-0003의 디자인 설명).
 *
 * 라우팅을 거는 쪽도 이것을 읽는다. SCR-002-A05의 '문서 보기'가 어느 화면으로
 * 가는지는 **그 단계의 문서 코드**가 정하기 때문이다(SCR-002-A05 디스크립션 2번). */
export const STAGES: { id: string; name: string; docs: DocCode[] }[] = [
  { id: "project", name: "프로젝트 정의서", docs: [] },
  { id: "requirements", name: "요구사항 정의서", docs: ["REQ"] },
  { id: "policy", name: "정책서", docs: ["POL"] },
  { id: "flow", name: "유저·워크 플로우", docs: ["UF", "WF"] },
  { id: "ia", name: "정보 구조도", docs: ["IA"] },
  { id: "screen", name: "화면설계서", docs: ["SB"] },
  { id: "qa", name: "검증", docs: ["QA"] },
];

const DOC_NAME: Record<DocCode, string> = {
  REQ: "요구사항 정의서",
  POL: "정책서",
  UF: "유저 플로우",
  WF: "워크 플로우",
  IA: "정보 구조도",
  SB: "화면설계서",
  QA: "검증 보고서",
};

/** 상태 줄에서 그 문서의 상태를 꺼낸다. 줄이 없으면 '대기'다(POL-005의 예외). */
function stateOf(rows: StatusRow[], doc: DocCode): string {
  return rows.find((r) => r.doc === doc)?.state ?? "대기";
}

/** 일곱 단계를 status.json에서 만든다. */
function stages(projectId: string) {
  const rows = status(projectId);
  const confirmed = read<{ confirmed?: boolean }>(projectId, "project.json")?.confirmed;
  return STAGES.map((s) => {
    if (s.id === "project") {
      return { id: s.id, name: s.name, state: confirmed ? "승인" : "대기", waiting: !confirmed };
    }
    const docs = s.docs.map((d) => ({ id: d, name: DOC_NAME[d], state: stateOf(rows, d) }));
    const own = docs.length === 1 ? docs[0].state : undefined;
    return {
      id: s.id,
      name: s.name,
      state: own,
      docs: docs.length > 1 ? docs : undefined,
      // 사람의 확정·승인을 기다리는 단계
      waiting: docs.some((d) => d.state === "검토 필요"),
    };
  });
}

/** 지금 진행 중인 단계의 자리. 승인이 아닌 첫 단계다. 다 끝났으면 -1이다. */
function currentIndex(projectId: string): number {
  return stages(projectId).findIndex((s) => {
    const all = s.docs ? s.docs.map((d) => d.state) : [s.state];
    return all.some((x) => x !== "승인");
  });
}

/** POL-005가 정한 다섯 상태의 앞뒤 차례. 앞일수록 뒤처진 것이다. */
const ORDER = ["대기", "수정 필요", "생성 중", "검토 필요", "승인"];

/** 묶인 문서 가운데 뒤처진 쪽을 고른다(POL-006). */
function behindOf(docs: { state: string }[]): string {
  return docs
    .map((d) => d.state)
    .reduce((a, b) => (ORDER.indexOf(a) <= ORDER.indexOf(b) ? a : b));
}

/** 승인된 항목이 바뀐 기록. 없으면 null이다. */
function changeNotice(projectId: string) {
  const changes = read<{ items?: unknown[] }>(projectId, "_meta/changes.json")?.items ?? [];
  if (changes.length === 0) return null;
  return {
    title: "승인된 항목이 바뀌었습니다",
    description: `변경 ${changes.length}건의 영향받는 산출물과 판정을 확인하십시오.`,
  };
}

/* ---------------------------------------------------------------- 화면마다 */

function scr001(projectId: string, ui: UiState): State {
  const rows = status(projectId);
  const list = stages(projectId);
  const cur = currentIndex(projectId);
  // project.json에 이름 칸이 없다. 뷰어가 지어내지 않고 프로젝트 ID를 그대로 쓴다.
  const done = list.filter((s) =>
    s.docs ? s.docs.every((d) => d.state === "승인") : s.state === "승인",
  ).length;
  const over = cur < 0;

  return {
    keyword: ui.keyword ?? "",
    projects: [
      {
        id: projectId,
        name: projectId,
        // 진행 상태는 아직 끝나지 않은 가장 앞선 단계의 것이다(POL-008).
        state: over ? "승인" : (list[cur].docs ? behindOf(list[cur].docs!) : list[cur].state),
        stages: list.map((s) => (s.docs ? behindOf(s.docs) : s.state)),
        currentStage: over ? "일곱 단계 모두 끝남" : `진행 중: ${list[cur].name}`,
        doneCount: `${done} / ${list.length} 단계 끝남`,
        updatedAt: `마지막 변경 ${(rows.find((r) => r.approved_at)?.approved_at ?? "").slice(5) || "—"}`,
      },
    ],
    selectedProjectId: ui.selectedProjectId ?? null,
    repoReadAt: ui.repoReadAt ?? READ_AT,
  };
}

function scr002(projectId: string, ui: UiState): State {
  const list = stages(projectId);
  const sel = list.find((s) => s.id === ui.selectedStage);
  const notice = changeNotice(projectId);

  const waiting = list.filter((s) => s.waiting);
  const head = waiting[0];

  return {
    stages: list,
    currentIndex: currentIndex(projectId),
    // **`selectedStage`는 고른 단계의 요약이다.**
    // SCR-002-A04는 이 키에 쓰기만 하고(`onSelect`) 읽지 않는다. 읽는 쪽은
    // SCR-002-A05의 `summary`다. 그래서 고른 ID가 아니라 요약을 담는다.
    // 고른 ID는 ui가 따로 쥔다.
    selectedStage: sel
      ? {
          title: sel.name,
          meta: sel.docs
            ? [sel.docs.map((d) => `${d.name} ${d.state}`).join(" · ")]
            : [`상태 ${sel.state ?? "—"}`],
        }
      : null,
    expandedStage: ui.expandedStage ?? null,
    expandedNotice: ui.expandedNotice ?? false,
    // 사람을 기다리는 일. 없으면 줄 자체를 보이지 않는다.
    waitingTitle: head ? `${head.name}의 확인을 기다립니다` : undefined,
    waitingOthers: waiting.slice(1).map((s) => ({ id: s.id, title: `${s.name}의 확인을 기다립니다` })),
    // 열린 PR의 실시간 조회는 MVP 밖이다(DRM 2절).
    pullRequests: [],
    changeNotice: notice,
    repoReadAt: ui.repoReadAt ?? READ_AT,
  };
}

const DOC_ORDER: DocCode[] = ["REQ", "POL", "UF", "WF", "IA", "SB", "QA"];

function scr003(projectId: string, ui: UiState): State {
  const rows = status(projectId);
  const code = (ui.docCode ?? "REQ") as DocCode;
  const list = code === "SB" ? [] : docItems(projectId, code as Exclude<DocCode, "SB">);
  const sel = list.find((i) => i.id === ui.selectedItemId) ?? null;

  // 참조는 양쪽으로 본다. 위는 이 항목이 가리키는 것, 아래는 이 항목을 가리키는 것.
  const all = DOC_ORDER.filter((d) => d !== "SB").flatMap((d) =>
    docItems(projectId, d as Exclude<DocCode, "SB">),
  );
  const byId = new Map(all.map((i) => [i.id, i]));
  const parents = (sel?.refs ?? []).map((id) => toRef(id, byId));
  const children = sel
    ? all.filter((i) => (i.refs ?? []).includes(sel.id)).map((i) => toRef(i.id, byId))
    : [];

  return {
    docs: DOC_ORDER.map((d) => ({
      id: d,
      label: DOC_NAME[d],
      state: stateOf(rows, d),
      // 아직 만들어지지 않은 문서는 누를 수 없다.
      disabled: d !== "SB" && docItems(projectId, d as Exclude<DocCode, "SB">).length === 0,
    })),
    docCode: code,
    items: list.map(toItem),
    selectedItemId: ui.selectedItemId ?? null,
    parentRefs: { label: "상위 항목", items: parents },
    childRefs: { label: "하위 항목", items: children },
    visitedTrail: [],
    repoReadAt: ui.repoReadAt ?? READ_AT,
  };
}

function toItem(i: Item) {
  return {
    id: i.id,
    title: i.title,
    description: i.description,
    origin: i.origin,
  };
}

/** 참조 한 줄. 저장소에 없는 ID는 끊긴 참조다(POL-011). */
function toRef(id: string, byId: Map<string, Item>) {
  const hit = byId.get(id);
  return hit
    ? { id, title: hit.title }
    : { id, broken: true, sub: "아직 만들어지지 않았거나 지워진 항목입니다" };
}

function scr004(projectId: string, ui: UiState): State {
  const rows = status(projectId);
  const kind = ui.flowKind ?? "user";
  const steps = docItems(projectId, kind === "user" ? "UF" : "WF");

  const nodes = steps.map((s) => ({
    id: s.id,
    title: s.title,
    type: (s as { step_type?: string }).step_type,
  }));
  // 연결 하나가 두 영역에 간다. A03(BRQ-0009)은 다이어그램의 선으로 읽고
  // A04(BRQ-0008)는 참조 줄로 읽는다. 화면 파일이 둘 다 `edges`를 가리키므로
  // 한 객체가 두 모양을 함께 든다. 값은 모두 플로우 JSON에서 온 것이다.
  const edges = steps.flatMap((s) =>
    ((s as { next?: { to: string; condition?: string; policy?: string }[] }).next ?? []).map((n) => ({
      from: s.id,
      to: n.to,
      condition: n.condition,
      policy: n.policy ?? null,
      // 참조 줄로 읽을 때의 모양. ID 배지는 그 갈래에 걸린 정책이다.
      id: n.policy ?? `${s.id}-${n.to}`,
      title: n.condition,
      // 정책이 없는 갈래는 갈 곳이 없어 누를 수 없다(POL-011).
      broken: !n.policy,
      sub: n.policy ? undefined : "이 갈래에 정책이 없습니다",
    })),
  );

  return {
    flows: [
      { id: "user", label: "유저 플로우", state: stateOf(rows, "UF") },
      { id: "work", label: "워크 플로우", state: stateOf(rows, "WF") },
    ],
    flowKind: kind,
    nodes,
    edges,
    selectedNodeId: ui.selectedNodeId ?? null,
    exportState: ui.exportState ?? "대기",
    repoReadAt: ui.repoReadAt ?? READ_AT,
  };
}

function scr005(projectId: string, ui: UiState): State {
  const ids = screenIds(projectId);
  const sid = ui.screenId ?? ids[0] ?? null;
  const s = sid ? screen(projectId, sid) : null;
  const areas = s?.areas ?? [];
  const area = areas.find((a) => a.id === ui.selectedAreaId) ?? null;

  const blocks = areas.map((a) => a.block);
  const group = (pred: (id: string) => boolean) =>
    [...new Set(blocks.filter((b) => pred(b.id)).map((b) => `${b.id}|${b.version}`))].map((k) => {
      const [id, meta] = k.split("|");
      return { id, meta, title: areas.find((a) => a.block.id === id)?.title };
    });

  return {
    screens: ids.map((id) => ({
      id,
      label: screen(projectId, id)?.title ?? id,
      state: null,
    })),
    screenId: sid,
    screenAreas: areas,
    selectedAreaId: ui.selectedAreaId ?? null,
    previewState: ui.previewState ?? (s?.state ?? {}),
    areaDescription: area?.description ?? [],
    areaExceptions: area?.exceptions ?? [],
    areaRequirements: { label: "요구사항", items: (area?.requirements ?? []).map((id) => ({ id })) },
    areaPolicies: { label: "정책", items: (area?.policies ?? []).map((id) => ({ id })) },
    libraryBlocks: { label: "라이브러리", items: group((id) => id.startsWith("BLK")) },
    requestedBlocks: { label: "등록 요청", items: group((id) => id.startsWith("BRQ")) },
    unknownBlocks: { label: "알 수 없음", items: [] },
    exportState: ui.exportState ?? "대기",
    repoReadAt: ui.repoReadAt ?? READ_AT,
  };
}

interface Rule extends Item {
  rule?: string;
  result?: string;
  targets?: string[];
  owner_agent?: string;
  metric?: number | null;
}

function scr006(projectId: string, ui: UiState): State {
  const rules = (read<{ items?: Rule[] }>(projectId, "validation.json")?.items ?? []) as Rule[];
  const sel = rules.find((r) => r.rule === ui.selectedRuleId) ?? null;
  const passed = rules.filter((r) => r.result === "통과").length;
  const failed = rules.filter((r) => r.result === "실패");
  const metric = rules.find((r) => r.metric !== null && r.metric !== undefined)?.metric;

  const targets = sel?.targets ?? failed.flatMap((r) => r.targets ?? []);
  const isScreen = (t: string) => t.startsWith("SCR-") || t.startsWith("WU-");

  return {
    summary: [
      { id: "passed", label: "통과한 규칙", value: passed, sub: `규칙 ${rules.length}개 가운데` },
      { id: "failed", label: "실패한 규칙", value: failed.length, sub: "담당 에이전트가 정해져 있습니다" },
      { id: "metric", label: "요구사항 반영률", value: metric ?? null, sub: "QA-01이 센 값" },
    ],
    rules: rules.map((r) => ({
      id: r.rule ?? r.id,
      title: r.rule ?? r.id,
      description: r.owner_agent ? `넘길 담당: ${r.owner_agent}` : undefined,
      verdict: r.result,
      meta: (r.targets?.length ?? 0) > 0 ? `${r.targets!.length}건` : undefined,
    })),
    selectedRuleId: ui.selectedRuleId ?? null,
    ruleDetail: sel ? { title: sel.rule ?? sel.id, meta: [`넘길 담당: ${sel.owner_agent ?? "—"}`] } : null,
    ruleVerdict: sel?.result ?? null,
    ruleLinks: [],
    docTargets: { label: "문서 항목", items: targets.filter((t) => !isScreen(t)).map((id) => ({ id })) },
    screenTargets: { label: "화면·작업 단위", items: targets.filter(isScreen).map((id) => ({ id })) },
    libraryBlocks: { label: "라이브러리", items: [] },
    requestedBlocks: { label: "등록 요청", items: [] },
    unknownBlocks: { label: "알 수 없음", items: [] },
    changeNotice: changeNotice(projectId),
    repoReadAt: ui.repoReadAt ?? READ_AT,
  };
}

interface Change {
  change_id?: string;
  item_id?: string;
  before?: string;
  after?: string;
  by?: string;
  commit?: string;
  impact?: { item_id: string; verdict: string }[];
}

function scr007(projectId: string, ui: UiState): State {
  const changes = (read<{ items?: Change[] }>(projectId, "_meta/changes.json")?.items ?? []) as Change[];
  const sel = changes.find((c) => c.change_id === ui.selectedChangeId) ?? null;
  const impact = sel?.impact ?? changes.flatMap((c) => c.impact ?? []);
  // 판정은 changes.json에 적힌 것을 그대로 쓴다. 뷰어가 매기지 않는다(POL-019).
  const of = (v: string) => impact.filter((i) => i.verdict === v).map((i) => ({ id: i.item_id }));

  const rules = read<{ items?: Rule[] }>(projectId, "validation.json")?.items ?? [];
  const failedTargets = (rules as Rule[])
    .filter((r) => r.result === "실패")
    .flatMap((r) => (r.targets ?? []).map((id) => ({ id, sub: `${r.rule} 실패` })));

  return {
    summary: [
      { id: "changes", label: "변경", value: changes.length, sub: "승인된 항목이 바뀐 기록" },
      { id: "fix", label: "수정 필요", value: of("수정 필요").length, sub: "바뀐 항목을 참조하는 하위" },
      { id: "review", label: "검토 필요", value: of("검토 필요").length, sub: "바뀐 항목이 참조하던 상위" },
    ],
    changes: changes.map((c) => ({
      id: c.change_id ?? "",
      title: c.item_id,
      description: c.by ? `바꾼 주체: ${c.by}` : undefined,
      meta: c.impact ? `${c.impact.length}건` : undefined,
    })),
    selectedChangeId: ui.selectedChangeId ?? null,
    needsFix: { label: "수정 필요", items: of("수정 필요") },
    needsReview: { label: "검토 필요", items: of("검토 필요") },
    failedTargets: { label: "검증 실패에서", items: failedTargets },
    impactedTargets: { label: "변경 영향에서", items: impact.map((i) => ({ id: i.item_id })) },
    repoReadAt: ui.repoReadAt ?? READ_AT,
  };
}

const BUILDERS: Record<string, (p: string, ui: UiState) => State> = {
  "SCR-001": scr001,
  "SCR-002": scr002,
  "SCR-003": scr003,
  "SCR-004": scr004,
  "SCR-005": scr005,
  "SCR-006": scr006,
  "SCR-007": scr007,
};

/**
 * 그 화면의 state를 만든다.
 *
 * 화면 파일의 `state`를 바탕으로 깔고 그 위에 저장소에서 읽은 값을 덮는다.
 * 화면 파일에 없는 키는 넣지 않는다 — 설계에 없는 값을 지어내지 않기 위해서다.
 * 다만 블록이 쓰는 곁값(`currentIndex` 같은 것)은 더한다.
 */
export function buildState(projectId: string, screenId: string, ui: UiState = {}): State {
  const base = screen(projectId, screenId)?.state ?? {};
  const built = BUILDERS[screenId]?.(projectId, ui) ?? {};
  return { ...base, ...built };
}
