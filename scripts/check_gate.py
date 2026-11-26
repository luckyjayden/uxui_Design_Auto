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
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib.project import (Project, ProjectError, GENERATED, STAGES, STAGE_ORDER,
                         check_common_fields, check_id_format, check_markdown_pair,
                         list_projects)


# ---------------------------------------------------------------- 시작 조건

def start_requirements(p, errors, wu=None):
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


def start_policy(p, errors, wu=None):
    _needs_generated(p, ["REQ"], errors)


def start_flow(p, errors, wu=None):
    _needs_generated(p, ["POL"], errors)


def start_ia(p, errors, wu=None):
    _needs_generated(p, ["UF", "WF"], errors)


def start_screen(p, errors, wu=None):
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


def start_qa(p, errors, wu=None):
    _needs_generated(p, ["SB"], errors)


# ---------------------------------------------------------------- 완료 조건

def complete_requirements(p, errors, wu=None):
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


def complete_policy(p, errors, wu=None):
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


def complete_flow(p, errors, wu=None):
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


def complete_ia(p, errors, wu=None):
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


def complete_screen(p, errors, wu=None):
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


def complete_qa(p, errors, wu=None):
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


START = {"requirements": start_requirements, "policy": start_policy, "flow": start_flow,
         "ia": start_ia, "screen": start_screen, "qa": start_qa}
COMPLETE = {"requirements": complete_requirements, "policy": complete_policy,
            "flow": complete_flow, "ia": complete_ia, "screen": complete_screen,
            "qa": complete_qa}


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
        (START if a.phase == "start" else COMPLETE)[a.stage](p, errors, a.work_unit)
    except ProjectError as e:
        print("읽을 수 없습니다: %s" % e)
        return 2

    label = STAGES[a.stage][0]
    word = "시작 조건" if a.phase == "start" else "완료 조건"
    target = " (%s)" % a.work_unit if a.work_unit else ""
    if errors:
        print("%s %s 미달%s: 문제 %d건" % (label, word, target, len(errors)))
        for e in errors:
            print("  -", e)
        return 1
    print("%s %s 통과%s" % (label, word, target))
    return 0


if __name__ == "__main__":
    sys.exit(main())
