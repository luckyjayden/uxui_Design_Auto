#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""record_approval.py의 회귀 시험. 저장소 루트에서 실행한다:

  python3 scripts/test_record_approval.py

projects/_smoke에 합성 데이터를 만들고, GitHub을 부르는 자리(read_pr)만 가짜로 바꿔
돌린다. 네트워크도 gh도 쓰지 않는다. 끝나면 _smoke를 지운다. 종료 코드 0이면 통과다.

보는 것은 둘이다. **승인을 지어내지 못하는가**(병합되지 않은 PR, 생성 중인 문서,
모르는 작업 단위)와 **일어난 승인을 제대로 옮겨 적는가**(세 필드, 작업 단위, 머리말).
"""
import io, json, os, shutil, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__))))
import record_approval as RA
from lib.project import Project, ProjectError

P = "projects/_smoke"
ok = True


def say(label, got, want):
    global ok
    good = got == want
    ok &= good
    print("%s%-46s %s" % ("OK " if good else "!! ", label, "" if good else "얻음 %r / 기대 %r" % (got, want)))


def w(rel, o):
    p = os.path.join(P, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    io.open(p, "w", encoding="utf8").write(json.dumps(o, ensure_ascii=False, indent=2) + "\n")


def md(rel, version="0.1.0", status="검토 필요"):
    p = os.path.join(P, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    io.open(p, "w", encoding="utf8").write(
        "---\ndoc: X\ntitle: t\nversion: %s\nstatus: %s\nowner: o\n"
        "updated: 2026-11-27\nrefs: []\n---\n\n# t\n본문\n" % (version, status))


def status(sb_state="검토 필요", wu=None, **over):
    rows = [dict(doc=d, state=over.get(d, "검토 필요"), approved_by=None, approved_at=None, pr=None)
            for d in ["REQ", "POL", "UF", "WF", "IA", "QA"]]
    rows.append(dict(doc="SB", state=sb_state, approved_by=None, approved_at=None, pr=None,
                     work_units=wu if wu is not None else []))
    w("_meta/status.json", {"doc": "STATUS", "version": "0.1.0", "items": rows})


def wus(*pairs):
    return [dict(id=i, title=i, state=s, approved_by=None, approved_at=None, pr=None)
            for i, s in pairs]


def ia(*pairs):
    w("ia.json", {"doc": "SCR", "version": "0.1.0", "items": [],
                  "work_units": [dict(id=i, title=i, description="d", screens=list(sc),
                                      refs=[], origin="ai", updated_at="2026-11-27")
                                 for i, sc in pairs]})


def read(doc):
    rows = json.load(open(P + "/_meta/status.json", encoding="utf8"))["items"]
    return next(r for r in rows if r["doc"] == doc)


PR = {"number": 42, "title": "t", "by": "luckyjayden", "at": "2026-11-27", "files": [], "sha": ""}


def run(argv, pr=None):
    """main()을 돌린다. GitHub을 부르는 자리만 가짜로 바꾼다."""
    RA.read_pr = lambda n: dict(pr or PR, number=n)
    old = sys.argv
    sys.argv = ["record_approval.py"] + argv
    try:
        return RA.main()
    finally:
        sys.argv = old


shutil.rmtree(P, ignore_errors=True)
os.makedirs(P)

# ---------------------------------------------------------------- 지어내지 못하는가

print("--- 승인을 지어내지 못한다 ---")

# read_pr은 병합되지 않은 PR을 거절한다. gh를 부르지 않고 그 판정만 떼어 본다.
RA.gh_json = lambda args: {"number": 7, "state": "OPEN", "mergedAt": None, "mergedBy": None}
try:
    RA.read_pr(7)
    say("병합 안 된 PR → 거절", "통과함", "거절")
except ProjectError as e:
    say("병합 안 된 PR → 거절", "POL-002" in str(e), True)

RA.gh_json = lambda args: {"number": 8, "state": "MERGED", "mergedAt": "2026-11-27T00:00:00Z",
                           "mergedBy": None, "files": [], "title": "t"}
try:
    RA.read_pr(8)
    say("병합자를 못 읽으면 → 거절", "통과함", "거절")
except ProjectError as e:
    say("병합자를 못 읽으면 → 거절", "누가 병합했는지" in str(e), True)

status(POL="생성 중")
md("POLICY.md")
plan, notes = RA.plan_for(Project("_smoke"), "POL", PR, [])
say("생성 중인 문서 → 건너뜀", plan, None)
say("  까닭을 알림", any("생성 중" in n for n in notes), True)

status(sb_state="검토 필요", wu=wus(("WU-001", "검토 필요")))
md("STORYBOARD.md")
plan, notes = RA.plan_for(Project("_smoke"), "SB", PR, ["WU-009"])
say("모르는 작업 단위 → 거절", plan, None)
say("  있는 것을 알려 줌", any("WU-001" in n for n in notes), True)

# ---------------------------------------------------------------- 옮겨 적는가

print("\n--- 일어난 승인을 옮겨 적는다 ---")

status(POL="검토 필요")
md("POLICY.md")
before = io.open(P + "/_meta/status.json", encoding="utf8").read()
say("미리 보기 rc=0", run(["_smoke", "--pr", "42", "--doc", "POL"]), 0)
say("  파일을 바꾸지 않음", io.open(P + "/_meta/status.json", encoding="utf8").read(), before)

say("--write rc=0", run(["_smoke", "--pr", "42", "--doc", "POL", "--write"]), 0)
row = read("POL")
say("  state=승인", row["state"], "승인")
say("  approved_by는 병합한 사람", row["approved_by"], "luckyjayden")
say("  approved_at=병합일", row["approved_at"], "2026-11-27")
say("  pr=번호", row["pr"], 42)
meta = io.open(P + "/POLICY.md", encoding="utf8").read()
say("  머리말 status도 승인", "status: 승인" in meta, True)
say("  본문은 그대로", meta.endswith("# t\n본문\n"), True)

say("같은 PR로 또 돌리면 적을 것 없음 rc=1", run(["_smoke", "--pr", "42", "--doc", "POL"]), 1)

# ---------------------------------------------------------------- 화면설계서

print("\n--- 화면설계서는 작업 단위마다 ---")

status(sb_state="검토 필요", wu=wus(("WU-001", "검토 필요"), ("WU-002", "검토 필요")))
md("STORYBOARD.md")
say("한 작업 단위만 --write", run(["_smoke", "--pr", "42", "--doc", "SB",
                                "--work-unit", "WU-001", "--write"]), 0)
row = read("SB")
say("  WU-001만 승인", [w["state"] for w in row["work_units"]], ["승인", "검토 필요"])
say("  SB 자체는 아직 아님", row["state"], "검토 필요")
say("  머리말도 아직 아님", "status: 검토 필요" in io.open(P + "/STORYBOARD.md", encoding="utf8").read(), True)

say("남은 작업 단위도 --write", run(["_smoke", "--pr", "42", "--doc", "SB",
                                 "--work-unit", "WU-002", "--write"]), 0)
row = read("SB")
say("  둘 다 승인", [w["state"] for w in row["work_units"]], ["승인", "승인"])
say("  이제 SB도 승인", row["state"], "승인")
say("  머리말도 승인", "status: 승인" in io.open(P + "/STORYBOARD.md", encoding="utf8").read(), True)

print("\n--- PR이 건드린 화면에서 작업 단위를 가린다 ---")

status(sb_state="검토 필요", wu=wus(("WU-001", "검토 필요"), ("WU-002", "검토 필요")))
md("STORYBOARD.md")
ia(("WU-001", ["SCR-001", "SCR-002"]), ("WU-002", ["SCR-003"]))
f2 = ["projects/_smoke/screens/SCR-003.json", "projects/_smoke/STORYBOARD.md"]
say("SCR-003을 건드린 PR → WU-002", RA.work_units_in(Project("_smoke"), f2), ["WU-002"])
say("SCR-001·002 → WU-001", RA.work_units_in(Project("_smoke"),
    ["projects/_smoke/screens/SCR-001.json", "projects/_smoke/screens/SCR-002.json"]), ["WU-001"])
say("화면을 안 건드리면 못 가림", RA.work_units_in(Project("_smoke"),
    ["projects/_smoke/STORYBOARD.md"]), [])

say("건드린 화면으로 --write", run(["_smoke", "--pr", "42", "--doc", "SB", "--write"],
                              dict(PR, files=f2)), 0)
row = read("SB")
say("  WU-002만 승인", [w["state"] for w in row["work_units"]], ["검토 필요", "승인"])
say("  남의 작업 단위는 건드리지 않음", row["work_units"][0]["pr"], None)

status(sb_state="검토 필요", wu=wus(("WU-001", "검토 필요")))
md("STORYBOARD.md")
say("못 가리고 --work-unit도 없으면 rc=1",
    run(["_smoke", "--pr", "42", "--doc", "SB"], dict(PR, files=["projects/_smoke/STORYBOARD.md"])), 1)

# ---------------------------------------------------------------- 머리말만 어긋난 경우

print("\n--- status.json은 승인인데 머리말이 안 따라온 경우 ---")

status(POL="검토 필요")
md("POLICY.md")
run(["_smoke", "--pr", "42", "--doc", "POL", "--write"])
# status.json만 두고 머리말을 되돌린다. 손으로 고치다 한쪽만 바뀐 상태다.
md("POLICY.md", status="검토 필요")
say("머리말 안 따라옴 → 적을 것 있음", run(["_smoke", "--pr", "42", "--doc", "POL"]), 0)
say("  미리 보기는 안 고침",
    "status: 검토 필요" in io.open(P + "/POLICY.md", encoding="utf8").read(), True)
say("--write로 머리말만", run(["_smoke", "--pr", "42", "--doc", "POL", "--write"]), 0)
say("  머리말이 승인", "status: 승인" in io.open(P + "/POLICY.md", encoding="utf8").read(), True)
row = read("POL")
say("  status.json은 그대로", (row["state"], row["pr"]), ("승인", 42))
say("둘 다 맞으면 적을 것 없음 rc=1", run(["_smoke", "--pr", "42", "--doc", "POL"]), 1)

status(sb_state="승인", wu=wus(("WU-001", "승인")))
json_path = P + "/_meta/status.json"
d = json.load(open(json_path, encoding="utf8"))
for r in d["items"]:
    if r["doc"] == "SB":
        r["pr"] = 42
        r["work_units"][0]["pr"] = 42
io.open(json_path, "w", encoding="utf8").write(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
md("STORYBOARD.md", status="검토 필요")
ia(("WU-001", ["SCR-001"]))
say("SB도 머리말만 맞춤", run(["_smoke", "--pr", "42", "--doc", "SB", "--write",
                         "--work-unit", "WU-001"]), 0)
say("  머리말이 승인", "status: 승인" in io.open(P + "/STORYBOARD.md", encoding="utf8").read(), True)

# ---------------------------------------------------------------- 어느 문서인가

print("\n--- PR이 건드린 파일에서 문서를 가린다 ---")

say("policies.json → POL", RA.docs_in("_smoke", ["projects/_smoke/policies.json"]), ["POL"])
say("STORYBOARD.md → SB", RA.docs_in("_smoke", ["projects/_smoke/STORYBOARD.md"]), ["SB"])
say("screens/ 아래 → SB", RA.docs_in("_smoke", ["projects/_smoke/screens/SCR-001.json"]), ["SB"])
say("여럿이면 여럿", RA.docs_in("_smoke", ["projects/_smoke/ia.json",
                                        "projects/_smoke/USER-FLOW.md"]), ["IA", "UF"])
say("다른 프로젝트는 안 셈", RA.docs_in("_smoke", ["projects/other/ia.json"]), [])
say("_meta는 문서가 아님", RA.docs_in("_smoke", ["projects/_smoke/_meta/runs.json"]), [])
say("docs/는 문서가 아님", RA.docs_in("_smoke", ["docs/08-data-spec.md"]), [])

status()
say("건드린 문서가 없으면 rc=1",
    run(["_smoke", "--pr", "42"], dict(PR, files=["docs/08-data-spec.md"])), 1)

shutil.rmtree(P, ignore_errors=True)
print("\n%s" % ("전체 통과: 승인을 지어내는 길 넷이 막히고, 옮겨 적는 길이 모두 기대대로 "
                "동작합니다." if ok else "실패가 있습니다."))
sys.exit(0 if ok else 1)
