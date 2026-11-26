#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""guard_write.py의 회귀 시험. 저장소 루트에서 실행한다: python3 scripts/test_guard.py

projects/_guard에 합성 데이터를 만들어 훅에 payload를 그대로 흘려 넣고, 막아야 할 것이
막히고 통과해야 할 것이 통과하는지 본다. 끝나면 _guard를 지운다. 종료 코드 0이면 통과다.

훅이 막는 다섯 가지를 모두 본다. 다섯째가 2026-11-26에 더한 자물쇠다.
"""
import io
import json
import os
import shutil
import subprocess

P = "projects/_guard"
HOOK = ".claude/hooks/guard_write.py"
MINE = "11111111-1111-1111-1111-111111111111"
OTHER = "22222222-2222-2222-2222-222222222222"


def w(rel, obj):
    p = os.path.join(P, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    io.open(p, "w", encoding="utf8").write(json.dumps(obj, ensure_ascii=False, indent=2))


def md(rel, txt):
    p = os.path.join(P, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    io.open(p, "w", encoding="utf8").write(txt)


def status(**over):
    docs = ["REQ", "POL", "UF", "WF", "IA", "QA", "SB"]
    rows = [dict(doc=d, state=over.get(d, "대기"), approved_by=None, approved_at=None, pr=None)
            for d in docs]
    w("_meta/status.json", {"doc": "STATUS", "version": "0.1.0", "items": rows})


def runs(*items):
    w("_meta/runs.json", {"doc": "RUNS", "version": "0.1.0", "items": list(items)})


def run(agent, session, finished=None, run_id="RUN-001"):
    return {"run_id": run_id, "agent": agent, "session": session,
            "started_at": "2026-11-26T10:00:00+09:00", "finished_at": finished,
            "read": [], "wrote": [], "result": "진행 중" if not finished else "완료",
            "attempt": 1}


def hook(path, content="{}", session=MINE, tool="Write"):
    """훅을 돌려 (종료 코드, stderr)를 돌려준다. 2가 막힌 것이다."""
    payload = {"hook_event_name": "PreToolUse", "tool_name": tool,
               "tool_input": {"file_path": os.path.abspath(path), "content": content}}
    if session:
        payload["session_id"] = session
    r = subprocess.run(["python3", HOOK], input=json.dumps(payload),
                       capture_output=True, text=True)
    return r.returncode, r.stderr.strip()


ok = [True]


def step(label, got, want):
    rc, err = got
    good = rc == want
    print("%s%-46s rc=%d (기대 %d)" % ("OK " if good else "!! ", label, rc, want))
    if not good:
        print("\n".join("      " + l for l in err.split("\n")) if err else "      (stderr 없음)")
        ok[0] = False


shutil.rmtree(P, ignore_errors=True)
os.makedirs(P)
md("USER-FLOW.md", "# uf\n")
w("user-flow.json", {"doc": "UF", "version": "0.1.0", "items": []})

print("--- 자물쇠: 상태가 '생성 중'이 아닐 때 ---")
status(UF="검토 필요")
runs(run("flow", OTHER))
step("검토 필요 → 통과", hook(P + "/user-flow.json"), 0)
step("검토 필요 → Markdown도 통과", hook(P + "/USER-FLOW.md", "# uf\n"), 0)

print("--- 자물쇠: 상태가 '생성 중'일 때 ---")
# flow 단계는 UF와 WF를 함께 만든다. 총괄이 둘 다 '생성 중'으로 바꾼다
status(UF="생성 중", WF="생성 중")
runs(run("flow", MINE))
step("내 세션이 쥔 실행 → 통과", hook(P + "/user-flow.json"), 0)
step("내 세션 + Markdown → 통과", hook(P + "/USER-FLOW.md", "# uf\n"), 0)

runs(run("flow", OTHER))
step("남의 세션이 쥐고 있음 → 막힘", hook(P + "/user-flow.json"), 2)
step("남의 세션 + Markdown → 막힘", hook(P + "/USER-FLOW.md", "# uf\n"), 2)
step("남의 세션 + 한 단계가 만드는 다른 문서 → 막힘", hook(P + "/WORKFLOW.md", "# wf\n"), 2)

# 상태는 문서마다다. 총괄이 WF를 안 바꾸면 WF는 잠기지 않는다
status(UF="생성 중")
step("같은 단계라도 상태를 안 바꾼 문서는 통과", hook(P + "/WORKFLOW.md", "# wf\n"), 0)
status(UF="생성 중", WF="생성 중")

runs(run("flow", OTHER, finished="2026-11-26T10:05:00+09:00"))
step("실행이 끝났는데 상태가 '생성 중' → 막힘", hook(P + "/user-flow.json"), 2)

runs()
step("진행 중인 실행이 없음 → 막힘", hook(P + "/user-flow.json"), 2)

runs(run("flow", None))
step("실행에 session이 없음 → 막힘", hook(P + "/user-flow.json"), 2)

print("--- 자물쇠를 걸지 않는 곳 ---")
status(UF="생성 중")
runs(run("flow", OTHER))
step("_meta/는 총괄 것이라 통과", hook(P + "/_meta/runs.json"), 0)
step("정의서는 사람 것이라 통과", hook(P + "/PROJECT.md", "# p\n"), 0)
step("다른 단계의 문서는 통과", hook(P + "/ia.json"), 0)
step("session_id가 없으면 판단 불가 → 통과", hook(P + "/user-flow.json", session=None), 0)
step("저장소 밖 파일은 통과", hook("README.md", "# r\n"), 0)

print("--- 자물쇠: 화면설계서 ---")
status(SB="생성 중")
runs(run("screen", OTHER))
step("남의 세션 + screens/ → 막힘", hook(P + "/screens/SCR-001.json"), 2)
step("남의 세션 + STORYBOARD.md → 막힘", hook(P + "/STORYBOARD.md", "# sb\n"), 2)
runs(run("screen", MINE))
step("내 세션 + STORYBOARD.md → 통과", hook(P + "/STORYBOARD.md", "# sb\n"), 0)

print("--- 먼저 있던 규칙 넷 ---")
status()
runs()
step("reference/ 쓰기 → 막힘 (POL-024)",
     hook("reference/uxui-registry-mock/blocks/core/ui/dialog.json"), 2)
approved = json.dumps({"doc": "STATUS", "version": "0.1.0",
                       "items": [{"doc": "REQ", "state": "승인"}]}, ensure_ascii=False)
step("상태를 '승인'으로 → 막힘 (POL-002)",
     hook(P + "/_meta/status.json", approved), 2)

wu_approved = json.dumps({"doc": "STATUS", "version": "0.1.0",
                          "items": [{"doc": "SB", "state": "검토 필요",
                                     "work_units": [{"id": "WU-001", "state": "승인"}]}]},
                         ensure_ascii=False)
step("작업 단위를 '승인'으로 → 막힘 (POL-002)",
     hook(P + "/_meta/status.json", wu_approved), 2)

# 사람이 한 번 승인한 뒤에도 총괄이 status.json을 쓸 수 있어야 한다.
# 결과만 보고 막으면 여기서 파이프라인이 선다 (2026-11-26에 실제로 섰다)
w("_meta/status.json", {"doc": "STATUS", "version": "0.1.0", "items": [
    {"doc": "IA", "state": "승인", "approved_by": "사람", "pr": 4},
    {"doc": "SB", "state": "대기", "work_units": [{"id": "WU-001", "state": "승인"}]}]})
keep = json.dumps({"doc": "STATUS", "version": "0.1.0", "items": [
    {"doc": "IA", "state": "승인", "approved_by": "사람", "pr": 4},
    {"doc": "SB", "state": "생성 중", "work_units": [{"id": "WU-001", "state": "승인"}]}]},
    ensure_ascii=False)
step("이미 승인된 것을 둔 채 다른 줄 고치기 → 통과",
     hook(P + "/_meta/status.json", keep), 0)

add = json.dumps({"doc": "STATUS", "version": "0.1.0", "items": [
    {"doc": "IA", "state": "승인", "approved_by": "사람", "pr": 4},
    {"doc": "SB", "state": "승인", "work_units": [{"id": "WU-001", "state": "승인"}]}]},
    ensure_ascii=False)
step("이미 승인된 것 + 새 승인 하나 → 막힘",
     hook(P + "/_meta/status.json", add), 2)

status()

w("policies.json", {"doc": "POL", "version": "0.1.0",
                    "items": [{"id": "POL-001", "title": "t", "origin": "human"},
                              {"id": "POL-002", "title": "t", "origin": "ai"}]})
edited = json.dumps({"doc": "POL", "version": "0.1.0",
                     "items": [{"id": "POL-001", "title": "바뀜", "origin": "human"},
                               {"id": "POL-002", "title": "t", "origin": "ai"}]},
                    ensure_ascii=False)
step("origin이 human인 항목 덮어쓰기 → 막힘 (POL-010)",
     hook(P + "/policies.json", edited), 2)

dropped = json.dumps({"doc": "POL", "version": "0.1.0",
                      "items": [{"id": "POL-001", "title": "t", "origin": "human"}]},
                     ensure_ascii=False)
step("항목 ID 지우기 → 막힘 (POL-014)",
     hook(P + "/policies.json", dropped), 2)

shutil.rmtree(P, ignore_errors=True)
print()
if ok[0]:
    print("전체 통과: 자물쇠 19건과 먼저 있던 규칙 8건이 모두 기대대로 동작합니다.")
    raise SystemExit(0)
print("실패한 항목이 있습니다.")
raise SystemExit(1)
