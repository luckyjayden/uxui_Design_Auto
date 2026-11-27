#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""병합된 PR을 근거로 승인을 기록한다. 사람이 돌린다.

  python3 scripts/record_approval.py <project-id> --pr 12
  python3 scripts/record_approval.py <project-id> --pr 10 --work-unit WU-004
  python3 scripts/record_approval.py <project-id> --pr 12 --write

데이터 규격(docs/08-data-spec.md) 5절이 "승인 세 필드는 PR 병합 뒤 스크립트가 채웁니다"라고
예고해 둔 그 스크립트다. 그동안 없어서 사람이 status.json을 손으로 고쳐야 했고, 실제로
PR #7~#10이 병합된 뒤에도 승인 기록이 비어 있었다.

승인은 사람만 한다(POL-002). 그래서 이 스크립트는 **승인을 만들지 않고 이미 일어난 승인을
옮겨 적기만 한다.** 근거는 셋 다 GitHub에서 읽는다.

  state         '승인'. 단 PR이 실제로 병합됐을 때만
  approved_by   PR을 병합한 GitHub 사용자. 이 스크립트를 돌린 사람이 아니다
  approved_at   병합된 날
  pr            PR 번호

병합되지 않은 PR을 주면 거절한다. 누가 돌리든 GitHub에 없는 승인은 적히지 않는다.
쓰기 전 훅(.claude/hooks/guard_write.py)은 Write·Edit 도구만 보므로 이 스크립트에는
걸리지 않는다. 걸릴 필요도 없다. 훅이 막는 것은 에이전트가 승인을 지어내는 것인데
이 스크립트는 지어낼 수가 없다.

기본은 **미리 보기**다. 무엇을 적을지 보여 주기만 하고 파일을 건드리지 않는다.
실제로 적으려면 --write를 준다.

종료 코드: 0 통과, 1 적을 것이 없거나 거절, 2 입력이 잘못됨
"""
import argparse
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib.project import Project, ProjectError, DOC_FILES, front_matter, list_projects

APPROVED = "승인"
GENERATING = "생성 중"


# ---------------------------------------------------------------- GitHub

def gh_json(args):
    """gh를 부르고 JSON을 돌려준다. 못 부르면 ProjectError."""
    try:
        out = subprocess.run(["gh"] + args, capture_output=True, text=True)
    except OSError:
        raise ProjectError("gh를 찾을 수 없습니다. GitHub CLI가 있어야 PR을 읽습니다")
    if out.returncode != 0:
        raise ProjectError("gh가 실패했습니다: %s" % (out.stderr.strip() or out.stdout.strip()))
    try:
        return json.loads(out.stdout)
    except ValueError:
        raise ProjectError("gh의 출력을 읽을 수 없습니다")


def read_pr(number):
    """PR을 읽는다. 병합되지 않았으면 거절한다."""
    pr = gh_json(["pr", "view", str(number), "--json",
                  "number,state,mergedAt,mergedBy,author,title,files,mergeCommit"])
    if pr.get("state") != "MERGED":
        raise ProjectError(
            "PR #%s는 '%s'입니다. 병합된 PR만 승인의 근거가 됩니다 (POL-002).\n"
            "승인은 사람이 PR을 병합할 때 일어납니다. 먼저 병합하십시오."
            % (number, pr.get("state")))
    who = (pr.get("mergedBy") or {}).get("login")
    if not who:
        raise ProjectError("PR #%s를 누가 병합했는지 읽지 못했습니다" % number)
    return {
        "number": pr["number"],
        "title": pr.get("title", ""),
        "by": who,
        "at": (pr.get("mergedAt") or "")[:10],
        "files": [f["path"] for f in (pr.get("files") or [])],
        "sha": (pr.get("mergeCommit") or {}).get("oid", ""),
    }


# ---------------------------------------------------------------- 무엇이 승인됐는가

def docs_in(project_id, paths):
    """PR이 건드린 파일에서 이 프로젝트의 문서 코드를 가린다."""
    prefix = "projects/%s/" % project_id
    found = set()
    for path in paths:
        if not path.startswith(prefix):
            continue
        rest = path[len(prefix):]
        if rest.startswith("screens/") or rest == "STORYBOARD.md":
            found.add("SB")
            continue
        for doc, (js, md) in DOC_FILES.items():
            if rest in (js, md):
                found.add(doc)
    return sorted(found)


def work_units_in(p, paths):
    """PR이 건드린 화면 파일에서 어느 작업 단위인지 가린다.

    작업 단위를 사람이 고르게 두면 PR #10으로 WU-001까지 승인하는 일이 생긴다. WU-001은
    PR #7이 승인한 것이다. 어느 작업 단위인지는 PR이 건드린 화면이 말해 준다.
    """
    prefix = "projects/%s/screens/" % p.id
    touched = {os.path.basename(x)[:-5] for x in paths
               if x.startswith(prefix) and x.endswith(".json")}
    if not touched:
        return []
    return sorted(w["id"] for w in p.work_units()
                  if touched & set(w.get("screens") or []))


def version_now(p, doc):
    """지금 저장소에 있는 그 문서의 판. 모르면 None."""
    md_name = DOC_FILES[doc][1]
    if not p.exists(md_name):
        return None
    meta = front_matter(open(p.file(md_name), encoding="utf8").read())
    return (meta or {}).get("version")


def version_at(p, doc, sha):
    """PR이 병합될 때의 그 문서의 판. 못 읽으면 None."""
    if not sha:
        return None
    md_name = DOC_FILES[doc][1]
    path = "projects/%s/%s" % (p.id, md_name)
    try:
        out = subprocess.run(["git", "show", "%s:%s" % (sha, path)],
                             capture_output=True, text=True)
    except OSError:
        return None
    if out.returncode != 0:
        return None
    return (front_matter(out.stdout) or {}).get("version")


# ---------------------------------------------------------------- 적기

def plan_for(p, doc, pr, work_units):
    """그 문서에 무엇을 적을지 정한다. (적을 것, 알림) 둘을 돌려준다."""
    status = p.status()
    row = status.get(doc)
    notes = []
    if row is None:
        return None, ["%s 줄이 status.json에 없습니다" % doc]

    state = row.get("state")
    if state == GENERATING:
        return None, ["%s가 '생성 중'입니다. 끝나지 않은 실행이 쥐고 있어 건너뜁니다" % doc]

    was, now = version_at(p, doc, pr["sha"]), version_now(p, doc)
    if was and now and was != now:
        notes.append("%s는 PR #%s가 병합할 때 %s였고 지금은 %s입니다. "
                     "**이 PR이 승인한 것은 %s입니다.** 지금 판을 승인하려면 그 판을 담은 PR을 "
                     "병합하십시오" % (doc, pr["number"], was, now, was))

    stamp = {"state": APPROVED, "approved_by": pr["by"],
             "approved_at": pr["at"], "pr": pr["number"]}

    if doc != "SB":
        if state == APPROVED and row.get("pr") == pr["number"]:
            return None, notes + ["%s는 이미 PR #%s로 승인돼 있습니다" % (doc, pr["number"])]
        return {"doc": doc, "set": stamp, "work_units": []}, notes

    # 화면설계서는 작업 단위마다 승인하고, 모두 승인돼야 SB가 승인된다 (데이터 규격 5절)
    rows = row.get("work_units") or []
    if not rows:
        return None, notes + ["SB에 work_units가 없습니다"]
    known = [w["id"] for w in rows]
    targets = work_units
    if not targets:
        targets = work_units_in(p, pr["files"])
        if targets:
            notes.append("PR이 건드린 화면에서 작업 단위를 가렸습니다: %s" % ", ".join(targets))
        else:
            return None, notes + [
                "이 PR이 어느 작업 단위인지 가리지 못했습니다. 건드린 화면 파일이 없습니다.\n"
                "    --work-unit으로 골라 주십시오 (있는 것: %s)" % ", ".join(known)]
    unknown = [w for w in targets if w not in known]
    if unknown:
        return None, notes + ["모르는 작업 단위입니다: %s (있는 것: %s)"
                              % (", ".join(unknown), ", ".join(known))]

    todo = [w for w in targets
            if not (rows[known.index(w)].get("state") == APPROVED
                    and rows[known.index(w)].get("pr") == pr["number"])]
    if not todo:
        return None, notes + ["작업 단위가 이미 PR #%s로 승인돼 있습니다" % pr["number"]]

    after = {w["id"]: (APPROVED if w["id"] in todo else w.get("state")) for w in rows}
    whole = all(s == APPROVED for s in after.values())
    if not whole:
        notes.append("아직 승인되지 않은 작업 단위가 있어 SB 자체는 '%s'로 둡니다: %s"
                     % (row.get("state"), ", ".join(w for w, s in after.items() if s != APPROVED)))
    return {"doc": "SB", "set": (stamp if whole else None), "work_units": todo}, notes


def apply(p, plans, pr):
    """status.json과 Markdown 머리말에 적는다."""
    path = p.file("_meta", "status.json")
    data = json.load(open(path, encoding="utf8"))
    rows = data["items"] if isinstance(data, dict) else data
    stamp = {"state": APPROVED, "approved_by": pr["by"],
             "approved_at": pr["at"], "pr": pr["number"]}
    touched = []
    for plan in plans:
        row = next(r for r in rows if r.get("doc") == plan["doc"])
        for wu in plan["work_units"]:
            w = next(x for x in row["work_units"] if x["id"] == wu)
            w.update(stamp)
            touched.append(wu)
        if plan["set"]:
            row.update(plan["set"])
            touched.append(plan["doc"])
    with open(path, "w", encoding="utf8") as f:
        f.write(json.dumps(data, ensure_ascii=False, indent=2) + "\n")

    # 머리말의 status도 맞춘다. 둘이 어긋나면 저장소만 읽는 쪽이 승인 여부를 가리지 못한다
    synced = []
    for plan in plans:
        if not plan["set"]:
            continue
        md_name = DOC_FILES[plan["doc"]][1]
        if not p.exists(md_name):
            continue
        text = open(p.file(md_name), encoding="utf8").read()
        meta = front_matter(text)
        if not meta or meta.get("status") == APPROVED:
            continue
        head, sep, body = text.partition("\n---\n")
        fixed = "\n".join(("status: " + APPROVED) if l.startswith("status:") else l
                          for l in head.split("\n"))
        open(p.file(md_name), "w", encoding="utf8").write(fixed + sep + body)
        synced.append(md_name)
    return touched, synced


# ---------------------------------------------------------------- 입출력

def main():
    ap = argparse.ArgumentParser(description="병합된 PR을 근거로 승인을 기록한다")
    ap.add_argument("project", nargs="?", help="projects/ 아래의 프로젝트 ID")
    ap.add_argument("--pr", type=int, required=False, help="병합된 PR 번호")
    ap.add_argument("--work-unit", dest="work_units", action="append", default=[],
                    help="화면설계서의 작업 단위 WU-000. 여러 번 줄 수 있습니다")
    ap.add_argument("--doc", dest="docs", action="append", default=[],
                    help="승인할 문서 코드를 직접 고릅니다. 없으면 PR이 건드린 파일에서 가립니다")
    ap.add_argument("--write", action="store_true", help="실제로 적습니다. 없으면 미리 보기만")
    a = ap.parse_args()

    if not a.project:
        ps = list_projects()
        print("프로젝트: %s" % (", ".join(ps) if ps else "없습니다"))
        return 2
    if not a.pr:
        ap.error("--pr로 병합된 PR 번호를 주십시오")

    try:
        p = Project(a.project)
        pr = read_pr(a.pr)
        docs = a.docs or docs_in(a.project, pr["files"])
    except ProjectError as e:
        print("할 수 없습니다: %s" % e)
        return 2 if "gh" in str(e) or "프로젝트" in str(e) else 1

    print("PR #%d  %s" % (pr["number"], pr["title"]))
    print("  병합: %s 가 %s" % (pr["by"], pr["at"]))
    if not docs:
        print("\n이 PR은 projects/%s의 문서를 건드리지 않았습니다." % a.project)
        return 1
    print("  문서: %s" % ", ".join(docs))

    plans, notes = [], []
    for doc in docs:
        plan, note = plan_for(p, doc, pr, a.work_units if doc == "SB" else [])
        notes += ["  - " + n for n in note]
        if plan:
            plans.append(plan)

    print()
    if notes:
        print("알림")
        print("\n".join(notes))
        print()
    if not plans:
        print("적을 것이 없습니다.")
        return 1

    print("적을 것")
    for plan in plans:
        for wu in plan["work_units"]:
            print("  %-8s state=승인  approved_by=%s  approved_at=%s  pr=%d"
                  % (wu, pr["by"], pr["at"], pr["number"]))
        if plan["set"]:
            print("  %-8s state=승인  approved_by=%s  approved_at=%s  pr=%d"
                  % (plan["doc"], pr["by"], pr["at"], pr["number"]))

    if not a.write:
        print("\n미리 보기입니다. 실제로 적으려면 --write를 주십시오.")
        return 0

    touched, synced = apply(p, plans, pr)
    print("\n_meta/status.json에 적었습니다: %s" % ", ".join(touched))
    if synced:
        print("머리말의 status도 '승인'으로 맞췄습니다: %s" % ", ".join(synced))
    print("바뀐 파일을 커밋하십시오.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
