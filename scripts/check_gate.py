#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""에이전트의 시작 조건과 완료 조건을 판정한다.

  python3 scripts/check_gate.py <project-id> --stage policy --phase start
  python3 scripts/check_gate.py <project-id> --stage screen --phase complete --work-unit WU-001
  python3 scripts/check_gate.py <project-id> --next

판정을 모델이 아니라 스크립트가 하는 이유는 결과가 매번 같아야 하기 때문이다
(기능 정의서 7절, 개발 아키텍처 6절). 총괄 에이전트는 이 스크립트의 종료 코드를 보고 움직인다.

종료 코드: 0 통과, 1 조건 미달, 2 입력이 잘못됨
조건은 에이전트 명세(docs/09-agent-spec.md) 2~8절과 기능 정의서 7절의 표를 따른다.
"""
import argparse
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib.project import (Project, ProjectError, GENERATED, ROOT, STAGES, STAGE_ORDER,
                         STATES, VIEWER, check_common_fields, check_id_format,
                         check_markdown_pair, front_matter, list_projects)

# 판정은 아니지만 사람이 알아야 하는 것. 통과해도 출력한다.
NOTES = []


# ---------------------------------------------------------------- 시작 조건

def start_requirements(p, errors, wu=None, block=None):
    proj = p.json("project.json")
    if proj is None:
        errors.append("project.json이 없습니다. 사람이 프로젝트 정의서를 써야 시작합니다")
        return
    if proj.get("confirmed") is not True:
        errors.append("project.json의 confirmed가 true가 아닙니다. "
                      "사람이 정의서를 확정해야 시작합니다 (POL-007)")


def _needs_generated(p, docs, errors):
    for doc in docs:
        state = p.state_of(doc)
        if state not in GENERATED:
            errors.append("선행 문서 %s가 '%s'입니다. 생성이 끝나야 시작합니다" % (doc, state))


def start_policy(p, errors, wu=None, block=None):
    _needs_generated(p, ["REQ"], errors)


def start_flow(p, errors, wu=None, block=None):
    _needs_generated(p, ["POL"], errors)


def start_ia(p, errors, wu=None, block=None):
    _needs_generated(p, ["UF", "WF"], errors)


def start_screen(p, errors, wu=None, block=None):
    # 유일하게 '승인'을 요구하는 단계다 (POL-037)
    state = p.state_of("IA")
    if state != "승인":
        errors.append("정보 구조도가 '%s'입니다. 승인되어야 화면설계서를 시작합니다 (POL-037)" % state)
    if not wu:
        errors.append("작업 단위를 고르지 않았습니다. --work-unit WU-000을 주십시오 (REQ-026)")
        return
    units = {u["id"] for u in p.work_units()}
    if not units:
        errors.append("ia.json에 work_units가 없습니다 (FN-408)")
    elif wu not in units:
        errors.append("작업 단위 %s가 ia.json에 없습니다. 있는 것: %s" % (wu, ", ".join(sorted(units))))
    if p.work_unit_states().get(wu) == "승인":
        errors.append("작업 단위 %s는 이미 승인됐습니다" % wu)


def start_qa(p, errors, wu=None, block=None):
    _needs_generated(p, ["SB"], errors)


# ---------------------------------------------------------------- 완료 조건

def complete_requirements(p, errors, wu=None, block=None):
    check_markdown_pair(p, "REQ", errors)
    items = p.items("requirements.json")
    if not items:
        errors.append("requirements.json에 요구사항이 없습니다")
        return
    check_common_fields(items, "REQ", errors)
    check_id_format(items, "REQ", "requirements.json", errors)
    for i in items:
        iid = i.get("id")
        if i.get("priority") not in ("높음", "보통", "낮음"):
            errors.append("%s: priority가 높음·보통·낮음 중 하나가 아닙니다" % iid)
        if not i.get("acceptance"):
            errors.append("%s: acceptance(수용 기준)가 비어 있습니다" % iid)
        if i.get("type") not in ("기능", "비기능", "제약"):
            errors.append("%s: type이 기능·비기능·제약 중 하나가 아닙니다" % iid)
    # 정의서의 목표마다 요구사항이 하나 이상 걸려야 한다
    proj = p.json("project.json") or {}
    covered = {r for i in items for r in i.get("refs", [])}
    for goal in proj.get("goals", []):
        if goal["id"] not in covered:
            errors.append("목표 %s를 가리키는 요구사항이 없습니다" % goal["id"])


def complete_policy(p, errors, wu=None, block=None):
    check_markdown_pair(p, "POL", errors)
    items = p.items("policies.json")
    if not items:
        errors.append("policies.json에 정책이 없습니다")
        return
    check_common_fields(items, "POL", errors)
    check_id_format(items, "POL", "policies.json", errors)
    reqs = p.ids("REQ")
    for i in items:
        iid = i.get("id")
        refs = [r for r in i.get("refs", []) if r.startswith("REQ-")]
        if not refs:
            errors.append("%s: 참조하는 요구사항이 없습니다 (QA-02)" % iid)
        for r in refs:
            if r not in reqs:
                errors.append("%s: 없는 요구사항 %s를 참조합니다" % (iid, r))
        if not i.get("conditions"):
            errors.append("%s: conditions가 비어 있습니다" % iid)
        for field in ("states", "exceptions"):
            if field not in i:
                errors.append("%s: %s가 없습니다" % (iid, field))


def complete_flow(p, errors, wu=None, block=None):
    check_markdown_pair(p, "UF", errors)
    check_markdown_pair(p, "WF", errors)
    uf = p.items("user-flow.json")
    wf = p.items("workflow.json")
    if not uf:
        errors.append("user-flow.json에 단계가 없습니다")
    if not wf:
        errors.append("workflow.json에 처리가 없습니다")
    if not uf or not wf:
        return
    check_common_fields(uf, "UF", errors)
    check_common_fields(wf, "WF", errors)
    check_id_format(uf, "UF", "user-flow.json", errors)
    check_id_format(wf, "WF", "workflow.json", errors)

    uf_ids = {i["id"] for i in uf if i.get("id")}
    pol_ids = p.ids("POL")
    uf_types = {"진입", "선택", "분기", "완료", "이탈"}

    for i in uf:
        iid, stype = i.get("id"), i.get("step_type")
        if stype not in uf_types:
            errors.append("%s: step_type '%s'가 허용된 값이 아닙니다" % (iid, stype))
        for n in i.get("next", []):
            if n.get("to") not in uf_ids:
                errors.append("%s: 없는 단계 %s로 이어집니다" % (iid, n.get("to")))
            if stype == "분기":
                pol = n.get("policy")
                if not pol:
                    errors.append("%s: 분기인데 next에 policy가 없습니다 (QA-03)" % iid)
                elif pol not in pol_ids:
                    errors.append("%s: 없는 정책 %s를 참조합니다" % (iid, pol))
        if "screen" not in i:
            errors.append("%s: screen 필드가 없습니다. IA Agent가 채우도록 null로 두십시오" % iid)

    # 이탈이 하나도 없으면 완료 조건 미달 (AGT 5절)
    if not any(i.get("step_type") == "이탈" for i in uf):
        errors.append("이탈 단계가 없습니다. 완료만 있는 플로우는 완료로 보지 않습니다")

    # 유저 플로우 단계마다 대응하는 워크 플로우 처리가 있어야 한다 (QA-03)
    covered = {w.get("user_step") for w in wf}
    for i in uf:
        if i.get("step_type") == "이탈":
            continue
        if i.get("id") not in covered:
            errors.append("%s: 대응하는 워크 플로우 처리가 없습니다 (QA-03)" % i.get("id"))
    for w in wf:
        us = w.get("user_step")
        if us and us not in uf_ids:
            errors.append("%s: 없는 유저 플로우 단계 %s를 가리킵니다" % (w.get("id"), us))


# screen 필드를 꼭 채워야 하는 단계 유형. 분기와 이탈은 비워 둘 수 있다. (제안)
SCREEN_REQUIRED_TYPES = {"진입", "선택", "완료"}


def complete_ia(p, errors, wu=None, block=None):
    check_markdown_pair(p, "IA", errors)
    items = p.items("ia.json")
    if not items:
        errors.append("ia.json에 화면이 없습니다")
        return
    check_common_fields(items, "SCR", errors)
    check_id_format(items, "SCR", "ia.json", errors)
    scr_ids = {i["id"] for i in items if i.get("id")}

    for i in items:
        for t in i.get("transitions", []):
            if t.get("to") not in scr_ids:
                errors.append("%s: 없는 화면 %s로 이동합니다 (QA-04)" % (i.get("id"), t.get("to")))

    # 플로우의 화면 단계가 모두 배정됐는가
    for s in p.items("user-flow.json"):
        if s.get("step_type") in SCREEN_REQUIRED_TYPES:
            scr = s.get("screen")
            if not scr:
                errors.append("%s(%s): 화면이 배정되지 않았습니다" % (s.get("id"), s.get("step_type")))
            elif scr not in scr_ids:
                errors.append("%s: 없는 화면 %s에 배정됐습니다" % (s.get("id"), scr))

    # 모든 화면이 작업 단위 하나에만 속하는가 (POL-036)
    units = p.work_units()
    if not units:
        errors.append("work_units가 없습니다. 화면을 작업 단위로 묶어야 합니다 (FN-408)")
        return
    owner = {}
    for u in units:
        if not u.get("screens"):
            errors.append("작업 단위 %s에 속한 화면이 없습니다" % u.get("id"))
        for s in u.get("screens", []):
            if s not in scr_ids:
                errors.append("작업 단위 %s가 없는 화면 %s를 가리킵니다" % (u.get("id"), s))
            if s in owner:
                errors.append("화면 %s가 작업 단위 %s와 %s에 모두 속합니다 (POL-036)"
                              % (s, owner[s], u.get("id")))
            owner[s] = u.get("id")
    for s in sorted(scr_ids):
        if s not in owner:
            errors.append("화면 %s가 어느 작업 단위에도 속하지 않습니다 (POL-036)" % s)


def complete_screen(p, errors, wu=None, block=None):
    check_markdown_pair(p, "SB", errors)
    if not wu:
        errors.append("작업 단위를 고르지 않았습니다. --work-unit WU-000을 주십시오")
        return
    unit = next((u for u in p.work_units() if u.get("id") == wu), None)
    if unit is None:
        errors.append("작업 단위 %s가 ia.json에 없습니다" % wu)
        return

    reqs, pols = p.ids("REQ"), p.ids("POL")
    for scr in unit.get("screens", []):
        name = "%s.json" % scr
        data = p.json("screens", name)
        if data is None:
            errors.append("%s: screens/%s가 없습니다" % (scr, name))
            continue
        if data.get("id") != scr:
            errors.append("screens/%s: id가 %s가 아닙니다" % (name, scr))
        state_keys = set((data.get("state") or {}).keys())
        areas = data.get("areas") or []
        if not areas:
            errors.append("%s: areas가 비어 있습니다" % scr)
        for a in areas:
            aid = a.get("id", "(영역 ID 없음)")
            blk = a.get("block") or {}
            if not blk.get("id") or not blk.get("version"):
                errors.append("%s: block의 id와 version이 있어야 합니다 (POL-023)" % aid)
            if not a.get("requirements"):
                errors.append("%s: 연결된 요구사항이 없습니다 (QA-01)" % aid)
            for r in a.get("requirements", []):
                if r not in reqs:
                    errors.append("%s: 없는 요구사항 %s를 참조합니다" % (aid, r))
            if not a.get("policies"):
                errors.append("%s: 연결된 정책이 없습니다" % aid)
            for r in a.get("policies", []):
                if r not in pols:
                    errors.append("%s: 없는 정책 %s를 참조합니다" % (aid, r))
            if "exceptions" not in a:
                errors.append("%s: exceptions가 없습니다 (QA-05)" % aid)
            for it in a.get("interactions", []):
                key = it.get("set")
                if key and key not in state_keys:
                    errors.append("%s: interactions의 set '%s'가 화면 state에 없습니다" % (aid, key))


QA_RULES = ["QA-0%d" % n for n in range(1, 8)]


def complete_qa(p, errors, wu=None, block=None):
    check_markdown_pair(p, "QA", errors)
    items = p.items("validation.json")
    judged = {i.get("rule"): i for i in items}
    for rule in QA_RULES:
        if rule not in judged:
            errors.append("%s를 판정하지 않았습니다" % rule)
            continue
        row = judged[rule]
        if row.get("result") not in ("통과", "실패"):
            errors.append("%s: result가 통과 또는 실패가 아닙니다" % rule)
        if row.get("result") == "실패" and not row.get("owner_agent"):
            errors.append("%s: 실패인데 owner_agent가 없습니다" % rule)
    if "QA-01" in judged and judged["QA-01"].get("metric") is None:
        errors.append("QA-01: 요구사항 반영률(metric)을 기록해야 합니다")


# ================================================================ 07~10 코드 단계
#
# 파이프라인 v2(docs/PIPELINE_V2.md)를 구현한다. 01~06과 다른 것이 셋이다.
#
#   되풀이 단위  작업 단위가 아니라 블록이다 (07)
#   판정 대상    문서가 아니라 코드다. viewer/ 아래를 읽는다
#   완료 조건    빌드와 시험이 통과하는가. 게이트가 직접 돌린다 (2026-11-27 결정)
#
# 뷰어가 파일럿 프로젝트 하나의 산출물인 동안만 맞는 대응이다 (PV2 2절·9절).

# SCR-005가 서는 데 필요한 아홉. UI 블록 커버리지(docs/UI_BLOCK_COVERAGE.md) 5절이 고른 것이다.
P0_BLOCKS = ["BRQ-0011", "BLK-0001", "BLK-0020", "BLK-0003", "BLK-0012",
             "BRQ-0012", "BRQ-0008", "BRQ-0013", "BRQ-0010"]

BLOCK_ID = re.compile(r"(BLK|BRQ)-\d{4}")
# 예외에 작은따옴표로 묶인 것은 사람에게 보이는 문구다. 코드 어딘가에 그대로 있어야 한다.
QUOTED = re.compile(r"'([^']+)'")
# 저장소에 쓰는 호출. 뷰어는 읽기만 한다 (POL-034, DEV 9절).
WRITE_CALLS = ["fetch(", "XMLHttpRequest", "sendBeacon", "localStorage.setItem",
               "sessionStorage.setItem", "indexedDB", "child_process", "fs.writeFile"]
COLOR_LIT = re.compile(r":[^;{}]*(#[0-9a-fA-F]{3,8}\b|rgba?\()")
TYPE_LIT = re.compile(r"(font-size|font-weight|line-height)\s*:\s*(?!var\()[^;]")
SPACE_LIT = re.compile(r"\b(padding|margin|gap)[a-z-]*\s*:([^;{}]+)")


def blocks_rows(p):
    return {r.get("block_id"): r for r in p.doc_items("UI") if r.get("block_id")}


def areas_using(p, block_id):
    return [(s, a) for s, a in p.areas() if (a.get("block") or {}).get("id") == block_id]


def open_runs(p, stage):
    rows = (p.json("_meta", "runs.json") or {}).get("items", [])
    return [r for r in rows if r.get("agent") == stage and not r.get("finished_at")]


def check_free(p, doc, errors):
    """자물쇠를 거는 것은 훅이다. 게이트는 상태와 실행 기록이 어긋난 것만 잡는다."""
    stages = [s for s, (_, docs) in STAGES.items() if doc in docs]
    if p.state_of(doc) == "생성 중" and not any(open_runs(p, s) for s in stages):
        errors.append("%s가 '생성 중'인데 _meta/runs.json에 진행 중인 실행이 없습니다. "
                      "먼저 돌던 실행이 끊겼거나 상태만 바꾼 것입니다. 사람이 봐야 합니다" % doc)


def viewer_text(sub_dir="src"):
    """viewer/src 아래 모든 소스를 한 덩이로 읽는다. 문구가 어딘가에 있는지 보는 데 쓴다."""
    out = []
    base = os.path.join(VIEWER, sub_dir)
    for d, dirs, files in os.walk(base):
        dirs[:] = [x for x in dirs if x not in ("node_modules", "dist")]
        for f in files:
            if f.endswith((".ts", ".tsx", ".css")):
                try:
                    out.append(open(os.path.join(d, f), encoding="utf8").read())
                except (IOError, UnicodeDecodeError):
                    pass
    return "\n".join(out)


def space_tokens():
    """tokens.css에 있는 --space-N의 N 값들."""
    path = os.path.join(VIEWER, "src", "tokens", "tokens.css")
    if not os.path.exists(path):
        return set()
    return set(re.findall(r"--space-(\d+)\s*:", open(path, encoding="utf8").read()))


def run_viewer(cmd, label, errors):
    """viewer에서 명령을 돌린다. 2026-11-27 결정에 따라 게이트가 직접 돌린다.

    완료 조건이 '빌드와 시험이 통과하는가'인데 에이전트의 자기 보고로 두면 게이트가 아니다.
    느리고 환경에 기대는 것이 그 값이다. 환경이 없으면 판정하지 않고 그 사실을 적는다.
    """
    if not os.path.exists(os.path.join(VIEWER, "package.json")):
        NOTES.append("%s: viewer/package.json이 없어 돌리지 않았습니다" % label)
        return
    if not os.path.isdir(os.path.join(VIEWER, "node_modules")):
        NOTES.append("%s: node_modules가 없어 돌리지 않았습니다. npm ci를 먼저 돌리십시오" % label)
        return
    try:
        r = subprocess.run(cmd, cwd=VIEWER, capture_output=True, text=True, timeout=900)
    except (OSError, subprocess.TimeoutExpired) as e:
        errors.append("%s를 돌리지 못했습니다: %s" % (label, e))
        return
    if r.returncode != 0:
        tail = (r.stdout + r.stderr).strip().split("\n")[-12:]
        errors.append("%s가 실패했습니다 (종료 코드 %d)\n      %s"
                      % (label, r.returncode, "\n      ".join(l.strip() for l in tail)))


def check_read_only(errors, label):
    """쓰기 호출과 승인하는 자리가 없는지 본다 (POL-002, POL-034)."""
    text = viewer_text()
    for call in WRITE_CALLS:
        if call in text:
            errors.append("%s: 저장소에 쓰는 호출 '%s'가 viewer/src에 있습니다. "
                          "뷰어는 읽기만 합니다 (POL-034)" % (label, call))
    for line in text.split("\n"):
        if "승인" in line and ("onClick" in line or "<button" in line):
            errors.append("%s: 승인하는 자리로 보이는 줄이 있습니다 (POL-002)\n      %s"
                          % (label, line.strip()[:100]))


# ---------------------------------------------------------------- 07 시작·완료

def start_implement(p, errors, wu=None, block=None):
    state = p.state_of("SB")
    if state != "승인":
        errors.append("화면설계서가 '%s'입니다. 승인되지 않은 설계로 코드를 만들지 않습니다" % state)
    if not block:
        errors.append("블록을 고르지 않았습니다. --block BLK-0000을 주십시오")
        return
    if not BLOCK_ID.fullmatch(block):
        errors.append("블록 ID '%s'가 BLK-0000 또는 BRQ-0000 형식이 아닙니다" % block)
        return
    if not areas_using(p, block):
        errors.append("%s를 쓰는 영역이 화면 파일에 없습니다. 쓰이지 않는 블록은 만들지 않습니다"
                      % block)
    check_free(p, "UI", errors)


def complete_implement(p, errors, wu=None, block=None):
    if not block:
        errors.append("블록을 고르지 않았습니다. --block BLK-0000을 주십시오")
        return
    data = p.doc_json("UI")
    if data is None:
        errors.append("viewer/blocks.json이 없습니다")
        return
    if data.get("doc") != "UI":
        errors.append("viewer/blocks.json의 doc이 'UI'가 아닙니다")
    row = blocks_rows(p).get(block)
    if row is None:
        errors.append("blocks.json에 %s 줄이 없습니다" % block)
        return

    for f in ("block_id", "version", "state", "component", "path", "props", "areas"):
        if not row.get(f):
            errors.append("%s: blocks.json에 %s가 없습니다" % (block, f))
    if row.get("state") not in STATES:
        errors.append("%s: state '%s'가 문서 상태 다섯 가운데 없습니다 (POL-005)"
                      % (block, row.get("state")))
    if row.get("state") == "승인":
        errors.append("%s: state를 '승인'으로 둘 수 없습니다. 승인은 사람이 PR을 "
                      "병합할 때 일어납니다 (POL-002)" % block)

    used = areas_using(p, block)
    declared = set(row.get("props") or [])

    # 1. props 덮기 — 키 하나라도 빠지면 그 영역이 그려지지 않는다
    for _, a in used:
        for key in (a.get("props") or {}):
            if key not in declared:
                errors.append("%s: 영역 %s의 prop '%s'가 blocks.json의 props에 없습니다"
                              % (block, a.get("id"), key))

    # 2. 쓰는 곳을 빠짐없이 적었는가
    want = sorted(a.get("id") for _, a in used)
    if sorted(row.get("areas") or []) != want:
        errors.append("%s: blocks.json의 areas가 실제로 쓰는 영역과 다릅니다. 쓰는 곳: %s"
                      % (block, ", ".join(want)))

    # 3. 화면 파일이 적어 둔 버전 범위 안에 있는가 (POL-023)
    rng = row.get("range")
    for _, a in used:
        v = (a.get("block") or {}).get("version")
        if rng and v and v != rng:
            errors.append("%s: 영역 %s는 '%s'를 적었는데 blocks.json의 range는 '%s'입니다"
                          % (block, a.get("id"), v, rng))

    rel = row.get("path") or ""
    src_path = os.path.join(ROOT, rel)
    if not os.path.exists(src_path):
        errors.append("%s: path가 가리키는 파일이 없습니다: %s" % (block, rel))
        return
    src = open(src_path, encoding="utf8").read()

    # 4. prop 이름이 글자 그대로 같은가 (POL-026)
    for key in sorted(declared):
        if not re.search(r"\b%s\b" % re.escape(key), src):
            errors.append("%s: prop '%s'가 %s에 글자 그대로 없습니다 (POL-026)"
                          % (block, key, rel))

    # 5. 예외에 적힌 문구를 실제로 보일 수 있는가
    everything = viewer_text()
    for _, a in used:
        literals = {v for v in (a.get("props") or {}).values() if isinstance(v, str)}
        for ex in a.get("exceptions") or []:
            for phrase in QUOTED.findall(ex):
                if phrase in everything or phrase in literals:
                    continue
                errors.append("%s: 영역 %s의 예외 문구 '%s'가 viewer/src 어디에도 없고 "
                              "영역의 props에도 없습니다" % (block, a.get("id"), phrase))

    # 6. 색·타이포·여백을 토큰으로 받는가
    folder = os.path.dirname(src_path)
    sizes = space_tokens()
    for name in sorted(os.listdir(folder)) if os.path.isdir(folder) else []:
        if not name.endswith(".css"):
            continue
        css = open(os.path.join(folder, name), encoding="utf8").read()
        # 줄이 아니라 선언 하나씩 본다. 한 줄에 여럿을 적으면 토큰을 쓴 선언 뒤에
        # 숨은 하드코딩을 놓친다.
        for decl in re.split(r"[;\n{}]", css):
            decl = decl.strip()
            if not decl or "var(" in decl:
                continue
            if COLOR_LIT.search(decl):
                errors.append("%s: %s에 색을 직접 적었습니다. 토큰을 쓰십시오\n      %s"
                              % (block, name, decl))
            if TYPE_LIT.search(decl) and "inherit" not in decl:
                errors.append("%s: %s에 타이포를 직접 적었습니다. 토큰을 쓰십시오\n      %s"
                              % (block, name, decl))
            m = SPACE_LIT.search(decl)
            if m:
                for n in re.findall(r"(\d+)px", m.group(2)):
                    if n in sizes:
                        errors.append("%s: %s에 %spx를 직접 적었습니다. "
                                      "var(--space-%s)가 있습니다\n      %s"
                                      % (block, name, n, n, decl))

    # 7. 쓰기 호출이 컴포넌트에 있는가
    for call in WRITE_CALLS:
        if call in src:
            errors.append("%s: 쓰는 호출 '%s'가 컴포넌트에 있습니다 (POL-034)" % (block, call))

    # 8. 시험이 이 컴포넌트를 부르는가
    comp = row.get("component") or ""
    tests = [t for t in _test_files() if re.search(r"\b%s\b" % re.escape(comp), t[1])]
    if comp and not tests:
        errors.append("%s: %s를 부르는 시험 파일이 없습니다" % (block, comp))

    run_viewer(["npm", "test"], "시험(vitest)", errors)
    run_viewer(["npm", "run", "build"], "빌드", errors)


def _test_files():
    out = []
    for d, dirs, files in os.walk(os.path.join(VIEWER, "src")):
        dirs[:] = [x for x in dirs if x != "node_modules"]
        for f in files:
            if f.endswith((".test.tsx", ".test.ts")):
                try:
                    out.append((f, open(os.path.join(d, f), encoding="utf8").read()))
                except (IOError, UnicodeDecodeError):
                    pass
    return out


# ---------------------------------------------------------------- 08 시작·완료

def start_render(p, errors, wu=None, block=None):
    state = p.state_of("IA")
    if state != "승인":
        errors.append("정보 구조도가 '%s'입니다. 이동이 정해져야 라우팅을 겁니다" % state)
    rows = blocks_rows(p)
    for b in P0_BLOCKS:
        st = (rows.get(b) or {}).get("state")
        if st not in GENERATED:
            errors.append("P0 블록 %s가 '%s'입니다. 아홉이 모두 '검토 필요' 이상이어야 "
                          "렌더러가 그릴 것이 생깁니다 (COV 5절)"
                          % (b, st or "blocks.json에 없음"))
    check_free(p, "RND", errors)


def complete_render(p, errors, wu=None, block=None):
    data = p.doc_json("RND")
    if data is None:
        errors.append("viewer/render.json이 없습니다")
        return
    if data.get("doc") != "RND":
        errors.append("viewer/render.json의 doc이 'RND'가 아닙니다")
    rows = {r.get("screen_id"): r for r in (data.get("items") or [])}

    wired = set()
    for name in p.screen_files():
        scr = p.json("screens", name) or {}
        sid = scr.get("id") or name[:-5]
        row = rows.get(sid)
        if row is None:
            errors.append("render.json에 %s 줄이 없습니다" % sid)
            continue
        areas = [a.get("id") for a in scr.get("areas") or []]
        drawn = list(row.get("areas_rendered") or []) + list(row.get("areas_unrendered") or [])
        if len(drawn) != len(areas):
            errors.append("%s: 그린 자리가 %d개인데 화면 파일의 영역은 %d개입니다. "
                          "못 그린 영역도 안내를 보이고 자리를 지킵니다"
                          % (sid, len(drawn), len(areas)))
        elif drawn != areas:
            errors.append("%s: 그린 차례가 화면 파일의 areas 차례와 다릅니다 (POL-014)\n"
                          "      화면 파일: %s\n      render.json: %s"
                          % (sid, " ".join(areas), " ".join(drawn)))
        for t in row.get("transitions_wired") or []:
            wired.add((sid, t.get("to"), t.get("trigger")))

        state_keys = set((scr.get("state") or {}).keys())
        for a in scr.get("areas") or []:
            for it in a.get("interactions") or []:
                key = it.get("set")
                if key and key not in state_keys:
                    errors.append("%s: 영역 %s의 set '%s'가 화면 state에 없습니다"
                                  % (sid, a.get("id"), key))

    for tr in p.transitions():
        if tr not in wired:
            errors.append("이동이 걸리지 않았습니다: %s → %s (%s)" % tr)

    check_read_only(errors, "렌더러")
    run_viewer(["npm", "test"], "시험(vitest)", errors)
    run_viewer(["npm", "run", "build"], "빌드", errors)


# ---------------------------------------------------------------- 09 시작·완료

IQ_RULES = ["IQ-0%d" % n for n in range(1, 9)]
IQ_OWNERS = ("implement", "render")


def start_impl_qa(p, errors, wu=None, block=None):
    _needs_generated(p, ["RND"], errors)
    check_free(p, "IQA", errors)


def complete_impl_qa(p, errors, wu=None, block=None):
    check_markdown_pair(p, "IQA", errors)
    items = p.doc_items("IQA")
    if not items:
        errors.append("viewer/impl-validation.json에 판정이 없습니다")
        return
    check_id_format(items, "IQ", "impl-validation.json", errors)
    judged = {i.get("rule"): i for i in items}
    for rule in IQ_RULES:
        if rule not in judged:
            errors.append("%s를 판정하지 않았습니다" % rule)
            continue
        row = judged[rule]
        if row.get("result") not in ("통과", "실패"):
            errors.append("%s: result가 통과 또는 실패가 아닙니다" % rule)
        if row.get("result") == "실패":
            if row.get("owner_agent") not in IQ_OWNERS:
                errors.append("%s: 실패인데 owner_agent가 implement 또는 render가 아닙니다 "
                              "(지금 '%s')" % (rule, row.get("owner_agent")))
            if not row.get("targets"):
                errors.append("%s: 실패인데 targets가 비어 있습니다. "
                              "'몇 건 있음'으로 끝내지 않습니다" % rule)
    if "IQ-01" in judged and judged["IQ-01"].get("metric") is None:
        errors.append("IQ-01: 영역 덮기 비율(metric)을 기록해야 합니다")


# ---------------------------------------------------------------- 10 시작·완료

def start_review(p, errors, wu=None, block=None):
    items = p.doc_items("IQA")
    judged = {i.get("rule"): i.get("result") for i in items}
    if not judged:
        errors.append("09 Implementation QA의 판정이 없습니다")
        return
    for rule in IQ_RULES:
        if judged.get(rule) != "통과":
            errors.append("%s가 '%s'입니다. 여덟을 모두 통과해야 사람을 부릅니다"
                          % (rule, judged.get(rule) or "판정 없음"))
    check_free(p, "PRV", errors)


def complete_review(p, errors, wu=None, block=None):
    path = p.doc_path("PRV", "md")
    if not os.path.exists(path):
        errors.append("viewer/PROTOTYPE-REVIEW.md가 없습니다")
        return
    text = open(path, encoding="utf8").read()
    meta = front_matter(text)
    if meta is None:
        errors.append("PROTOTYPE-REVIEW.md에 머리말이 없습니다")
        return
    # 판정 칸은 사람이 채운다. 에이전트가 채웠으면 그것이 잘못이다 (PV2 7절).
    if (meta.get("verdict") or "").strip() not in ("", "null", "~"):
        errors.append("PROTOTYPE-REVIEW.md의 verdict가 '%s'로 차 있습니다. "
                      "판정은 사람이 합니다. 비워 두십시오" % meta.get("verdict"))
    for src, to, trigger in p.transitions():
        if trigger not in text:
            errors.append("걸어 볼 길에 빠진 이동이 있습니다: %s → %s (%s)" % (src, to, trigger))
    unrendered = [a for r in p.doc_items("RND") for a in (r.get("areas_unrendered") or [])]
    for aid in unrendered:
        if aid not in text:
            errors.append("그리지 못한 영역 %s가 문서에 적히지 않았습니다" % aid)


START = {"requirements": start_requirements, "policy": start_policy, "flow": start_flow,
         "ia": start_ia, "screen": start_screen, "qa": start_qa,
         "implement": start_implement, "render": start_render,
         "impl-qa": start_impl_qa, "review": start_review}
COMPLETE = {"requirements": complete_requirements, "policy": complete_policy,
            "flow": complete_flow, "ia": complete_ia, "screen": complete_screen,
            "qa": complete_qa, "implement": complete_implement, "render": complete_render,
            "impl-qa": complete_impl_qa, "review": complete_review}


def next_stage(p):
    """지금 시작할 수 있는 단계를 앞에서부터 찾는다."""
    lines = []
    runnable = None
    for stage in STAGE_ORDER:
        label, docs = STAGES[stage]
        states = [p.state_of(d) for d in docs]
        errs = []
        try:
            START[stage](p, errs, wu=None)
        except ProjectError as e:
            errs.append(str(e))
        done = all(s in GENERATED for s in states)
        if stage == "screen":
            wus = p.work_unit_states()
            mark = "작업 단위 " + (", ".join("%s=%s" % kv for kv in sorted(wus.items())) or "없음")
        elif stage == "implement":
            # 07은 블록마다 되풀이하므로 '끝남'은 화면이 쓰는 블록이 다 선 것을 뜻한다
            rows = blocks_rows(p)
            need = {(a.get("block") or {}).get("id") for _, a in p.areas()} - {None}
            made = {b for b in need if (rows.get(b) or {}).get("state") in GENERATED}
            mark = "블록 %d종 가운데 %d종이 생성됨" % (len(need), len(made))
            done = bool(need) and made == need
        else:
            mark = "/".join("%s=%s" % (d, s) for d, s in zip(docs, states))
        if done:
            flag = "끝남"
        elif not errs:
            flag = "시작할 수 있음"
            runnable = runnable or stage
        else:
            flag = "막힘: " + errs[0]
        lines.append("  %-13s %-16s %s" % (stage, label, mark))
        lines.append("  %-13s └ %s" % ("", flag))
    print("프로젝트 %s의 단계" % p.id)
    print("\n".join(lines))
    if runnable:
        print("\n다음 단계: %s" % runnable)
        return 0
    print("\n시작할 수 있는 단계가 없습니다.")
    return 1


def main():
    ap = argparse.ArgumentParser(description="에이전트의 시작·완료 조건 판정")
    ap.add_argument("project", nargs="?", help="projects/ 아래의 프로젝트 ID")
    ap.add_argument("--stage", choices=STAGE_ORDER)
    ap.add_argument("--phase", choices=["start", "complete"])
    ap.add_argument("--work-unit", dest="work_unit", help="화면설계서 단계의 작업 단위 WU-000")
    ap.add_argument("--block", help="07 UI Implementation의 블록 BLK-0000 또는 BRQ-0000")
    ap.add_argument("--next", action="store_true", help="지금 시작할 수 있는 단계를 찾는다")
    a = ap.parse_args()

    if not a.project:
        ps = list_projects()
        print("프로젝트: %s" % (", ".join(ps) if ps else "없습니다"))
        return 2
    try:
        p = Project(a.project)
        if a.next:
            return next_stage(p)
        if not a.stage or not a.phase:
            ap.error("--stage와 --phase를 함께 주거나 --next를 주십시오")
        errors = []
        (START if a.phase == "start" else COMPLETE)[a.stage](p, errors, a.work_unit, a.block)
    except ProjectError as e:
        print("읽을 수 없습니다: %s" % e)
        return 2

    label = STAGES[a.stage][0]
    word = "시작 조건" if a.phase == "start" else "완료 조건"
    target = " (%s)" % (a.work_unit or a.block) if (a.work_unit or a.block) else ""
    if errors:
        print("%s %s 미달%s: 문제 %d건" % (label, word, target, len(errors)))
        for e in errors:
            print("  -", e)
    else:
        print("%s %s 통과%s" % (label, word, target))
    for note in NOTES:
        print("  참고:", note)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
