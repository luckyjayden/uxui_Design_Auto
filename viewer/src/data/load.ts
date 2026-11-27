/* 저장소를 읽는 유일한 통로다(DEV 9절).
 *
 * 화면은 파일 경로를 직접 알지 않는다. 여기를 거쳐야만 프로젝트 데이터에 닿는다.
 * 경계가 깨지는 모습은 화면 컴포넌트에 `../../projects/...` 같은 경로가 생기는 것이다.
 *
 * 읽기만 한다(POL-034). 쓰는 함수를 여기에 만들지 않는다. 데이터는 빌드할 때
 * JSON으로 묶여 들어가므로 실행 중에 네트워크를 쓰지 않는다.
 */

/* ---------------------------------------------------------------- 형 */

export type DocCode = "REQ" | "POL" | "UF" | "WF" | "IA" | "SB" | "QA";

export interface Item {
  id: string;
  title: string;
  description: string;
  refs: string[];
  origin: "ai" | "human";
  updated_at: string;
  [key: string]: unknown;
}

export interface Screen extends Item {
  state: Record<string, unknown>;
  areas: Area[];
}

export interface Area {
  id: string;
  title: string;
  block: { id: string; version: string };
  props: Record<string, unknown>;
  requirements: string[];
  policies: string[];
  description: string[];
  interactions: { trigger: string; set: string | null; result: string }[];
  exceptions: string[];
}

export interface WorkUnit {
  id: string;
  title: string;
  description: string;
  screens: string[];
  refs: string[];
}

export interface StatusRow {
  doc: DocCode;
  state: string;
  approved_by: string | null;
  approved_at: string | null;
  pr: number | null;
  work_units?: { id: string; state: string; pr: number | null }[];
}

export interface ProjectSummary {
  id: string;
  title: string;
  status: StatusRow[];
}

/* ---------------------------------------------------------------- 읽기 */

// 빌드할 때 projects/ 아래의 JSON을 전부 묶어 들어온다. 실행 중 읽기가 아니다.
const FILES = import.meta.glob<Record<string, unknown>>(
  "../../../projects/*/**/*.json",
  { eager: true, import: "default" },
);

const PREFIX = "../../../projects/";

/** 묶여 들어온 키를 `<project-id>/<나머지 경로>`로 바꾼다. */
function split(key: string): [string, string] | null {
  if (!key.startsWith(PREFIX)) return null;
  const rest = key.slice(PREFIX.length);
  const slash = rest.indexOf("/");
  if (slash < 0) return null;
  return [rest.slice(0, slash), rest.slice(slash + 1)];
}

/** 한 프로젝트의 파일 하나를 읽는다. 없으면 null. 던지지 않는다. */
export function read<T = unknown>(projectId: string, path: string): T | null {
  const hit = FILES[`${PREFIX}${projectId}/${path}`];
  return hit === undefined ? null : (hit as T);
}

/** 저장소에 있는 프로젝트 ID 전부. */
export function projectIds(): string[] {
  const ids = new Set<string>();
  for (const key of Object.keys(FILES)) {
    const parts = split(key);
    if (parts) ids.add(parts[0]);
  }
  return [...ids].sort();
}

/** 문서 코드 → 처리용 JSON 파일 이름. 데이터 규격 2절. */
const DOC_FILE: Record<Exclude<DocCode, "SB">, string> = {
  REQ: "requirements.json",
  POL: "policies.json",
  UF: "user-flow.json",
  WF: "workflow.json",
  IA: "ia.json",
  QA: "validation.json",
};

/** 문서의 항목 배열. 파일이 없거나 items가 없으면 빈 배열. */
export function items(projectId: string, doc: Exclude<DocCode, "SB">): Item[] {
  const data = read<{ items?: Item[] }>(projectId, DOC_FILE[doc]);
  return data?.items ?? [];
}

/** 화면 한 장. 없으면 null. */
export function screen(projectId: string, screenId: string): Screen | null {
  return read<Screen>(projectId, `screens/${screenId}.json`);
}

/** 그 프로젝트의 화면 ID 전부. `ia.json`에 적힌 순서를 따른다. */
export function screenIds(projectId: string): string[] {
  return items(projectId, "IA")
    .filter((x) => x.id.startsWith("SCR-"))
    .map((x) => x.id);
}

/** 화면 사이의 이동 하나. `ia.json`이 정한다. */
export interface Transition {
  /** 떠나는 화면. */
  from: string;
  /** 닿는 화면. */
  to: string;
  /** 사람이 하는 짓. `trigger`가 다르면 같은 곳으로 가도 다른 길이다. */
  trigger: string;
}

/** `ia.json`의 이동 전부. 화면 항목 안에 들어 있는 것을 펼친다.
 *
 * 라우팅을 거는 쪽(`src/screens/transitions.ts`)이 이것을 읽어 제가 건 길이
 * 저장소에 적힌 것과 같은지 스스로 맞대어 본다. 길을 여기서 만들지 않는다. */
export function transitions(projectId: string): Transition[] {
  return items(projectId, "IA").flatMap((s) =>
    ((s as { transitions?: { to: string; trigger: string }[] }).transitions ?? []).map((t) => ({
      from: s.id,
      to: t.to,
      trigger: t.trigger,
    })),
  );
}

/** 작업 단위 목록. `ia.json`의 `work_units`. */
export function workUnits(projectId: string): WorkUnit[] {
  const ia = read<{ work_units?: WorkUnit[] }>(projectId, "ia.json");
  return ia?.work_units ?? [];
}

/** 문서 상태. `_meta/status.json`. 뷰어는 이 값을 바꾸지 않는다(POL-002). */
export function status(projectId: string): StatusRow[] {
  const data = read<{ items?: StatusRow[] }>(projectId, "_meta/status.json");
  return data?.items ?? [];
}

/** 목록에 보일 만큼의 프로젝트 정보. */
export function projects(): ProjectSummary[] {
  return projectIds().map((id) => {
    const p = read<{ project_id?: string; title?: string }>(id, "project.json");
    return { id, title: p?.title ?? id, status: status(id) };
  });
}

/** 읽은 시점. POL-004가 화면에 함께 보이라고 정한 값이다.
 *
 * 데이터가 빌드할 때 묶여 들어오므로 "읽은 시점"은 곧 빌드 시점이다. 새로고침은
 * 페이지를 다시 불러 새 빌드를 받는 것을 뜻한다. 서버에서 다시 읽어 오는 것이 아니다. */
export const READ_AT: string = new Date(
  typeof __BUILT_AT__ === "string" ? __BUILT_AT__ : 0,
).toISOString();
