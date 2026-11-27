#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""쓰기 전 훅. 규칙을 어기는 쓰기를 막는다.

에이전트 명세(docs/09-agent-spec.md) 9절과 10절을 구현한다. 훅은 **막기만 하고 고치지 않는다.**
막히면 담당 에이전트를 다시 실행하거나 사람에게 묻는다.

막는 것
  1. reference/ 아래 쓰기            고치지 않기로 한 프로토타입과 표준 블록 (POL-024)
  2. status.json의 state를 '승인'으로  승인은 사람이 PR을 병합할 때만 (POL-002)
  3. origin이 human인 항목 덮어쓰기    사람이 고친 것은 재생성 대상이 아님 (POL-010)
  4. 항목 ID 지우기                   한 번 붙인 ID는 바꾸거나 재사용하지 않음 (POL-014)
  5. 남의 실행이 쥔 문서에 쓰기        상태가 '생성 중'인 문서는 그 실행을 띄운 세션만 쓴다

다섯째가 자물쇠다. 상태값 '생성 중'은 처음부터 "지금 누가 만들고 있다"는 뜻이었지만 읽는
코드가 없어 아무것도 막지 못했다. 2026-11-26에 두 세션이 같은 단계를 동시에 돌려 산출물이
서로 덮이고서야 드러났다. 주인은 `_meta/runs.json`의 끝나지 않은 실행이 쥐고, 주인을 가리는
열쇠는 훅이 받는 `session_id`다. 서브에이전트의 쓰기에도 주 세션과 같은 값이 와서, 총괄이
부른 에이전트는 통과하고 다른 세션만 막힌다.

종료 코드 2가 쓰기를 막고, stderr의 내용이 Claude에게 전달된다.
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "scripts"))

try:                                      # check_gate.py와 같은 표를 쓴다
    from lib.project import DOC_FILES, STAGES
except ImportError:                       # 스크립트가 없으면 자물쇠만 쉰다
    DOC_FILES = STAGES = None

GENERATING = "생성 중"

# viewer/ 아래 경로 → 문서 코드. 앞에서부터 맞는 것을 쓰고, 맞는 것이 없으면 UI다.
# 파이프라인 v2 2절이 코드에도 자물쇠를 걸기로 정했다. 01~06이 문서마다 거는 것과 같은
# 자리이며, 되풀이 단위만 다르다 — 07은 블록마다, 08은 화면 전체다.
VIEWER_DOCS = [
    ("render.json", "RND"),
    ("impl-validation.json", "IQA"),
    ("IMPL-QA-REPORT.md", "IQA"),
    ("PROTOTYPE-REVIEW.md", "PRV"),
    ("src/render/", "RND"),
    ("src/screens/", "RND"),
    ("src/data/", "RND"),
]


def deny(msg):
    sys.stderr.write("쓰기가 막혔습니다.\n%s\n" % msg)
    sys.exit(2)


def rel(path):
    try:
        return os.path.relpath(os.path.abspath(path), ROOT).replace(os.sep, "/")
    except ValueError:
        return path


def new_content(tool, ti, path):
    """이 쓰기가 끝났을 때의 내용을 미리 만든다. 알 수 없으면 None."""
    if tool == "Write":
        return ti.get("content", "")
    if tool in ("Edit", "MultiEdit"):
        if not os.path.exists(path):
            return None
        try:
            cur = open(path, encoding="utf8").read()
        except (IOError, UnicodeDecodeError):
            return None
        edits = ti.get("edits") or [ti]
        for e in edits:
            old, new = e.get("old_string"), e.get("new_string")
            if old is None or new is None or old not in cur:
                return None
            cur = cur.replace(old, new, -1 if e.get("replace_all") else 1)
        return cur
    return None


def approved_set(text):
    """status.json 내용에서 '승인'인 문서 코드와 작업 단위 ID를 꺼낸다. 못 읽으면 None."""
    try:
        rows = json.loads(text).get("items", [])
    except (ValueError, AttributeError):
        return None
    out = set()
    for x in rows:
        if not isinstance(x, dict):
            continue
        if x.get("state") == "승인":
            out.add(x.get("doc"))
        for w in x.get("work_units", []) or []:
            if isinstance(w, dict) and w.get("state") == "승인":
                out.add(w.get("id"))
    return out


def items_of(text):
    """JSON 본문에서 {id: 항목} 사전을 꺼낸다. 항목 배열이 아니면 None."""
    try:
        data = json.loads(text)
    except (ValueError, TypeError):
        return None
    rows = data.get("items") if isinstance(data, dict) else data
    if not isinstance(rows, list):
        return None
    out = {}
    for r in rows:
        if isinstance(r, dict) and r.get("id"):
            out[r["id"]] = r
    return out


def read_json(*parts):
    """프로젝트 파일을 읽는다. 없거나 깨졌으면 None."""
    try:
        with open(os.path.join(ROOT, *parts), encoding="utf8") as f:
            return json.load(f)
    except (IOError, ValueError, UnicodeDecodeError):
        return None


def pilot_project():
    """뷰어가 어느 프로젝트의 산출물인가.

    파일럿이 하나인 동안만 답할 수 있다(PV2 9절). 둘 이상이면 모른다고 답하고 자물쇠를
    걸지 않는다. 틀린 프로젝트의 상태를 보고 막는 것보다 안 막는 것이 낫다.
    """
    pid = os.environ.get("UXIU_PILOT")      # 시험이 가짜 프로젝트를 가리킬 때 쓴다
    if pid:
        return pid
    d = os.path.join(ROOT, "projects")
    try:
        ps = [x for x in os.listdir(d)
              if os.path.isdir(os.path.join(d, x)) and not x.startswith((".", "_"))]
    except OSError:
        return None
    return ps[0] if len(ps) == 1 else None


def target_doc(r):
    """경로가 어느 문서에 속하는지 (프로젝트 ID, 문서 코드)로 돌려준다.

    문서가 아니면 문서 코드가 None이다. `_meta/`는 총괄의 상태 파일이라 자물쇠를 걸지 않는다.
    정의서(PROJECT.md, project.json)는 사람이 쓰는 것이라 뺀다.

    `viewer/` 아래는 07~10이 만드는 코드다. 프로젝트 폴더 바깥이지만 파일럿 프로젝트의
    산출물로 본다(PV2 2절). 문서 코드는 그 파일을 만드는 단계를 따라 갈린다.
    """
    parts = r.split("/")
    if parts[0] == "viewer" and len(parts) > 1:
        pid = pilot_project()
        if not pid:
            return None, None
        rest = "/".join(parts[1:])
        for prefix, doc in VIEWER_DOCS:
            if rest == prefix or rest.startswith(prefix):
                return pid, doc
        return pid, "UI"
    if len(parts) < 3 or parts[0] != "projects":
        return None, None
    pid, rest = parts[1], "/".join(parts[2:])
    if rest.startswith("_meta/"):
        return pid, None
    if rest.startswith("screens/") or rest == "STORYBOARD.md":
        return pid, "SB"
    for doc, (js, md) in (DOC_FILES or {}).items():
        if rest in (js, md):
            return pid, doc
    return pid, None


def lock_holder(pid, doc):
    """그 문서를 쥔 실행들을 돌려준다. 끝나지 않은(finished_at이 빈) 실행이 주인이다."""
    runs = read_json("projects", pid, "_meta", "runs.json") or {}
    rows = runs.get("items") if isinstance(runs, dict) else runs
    stages = [s for s, (_, docs) in (STAGES or {}).items() if doc in docs]
    return [r for r in (rows or [])
            if isinstance(r, dict) and r.get("agent") in stages and not r.get("finished_at")]


def check_lock(r, session):
    """자물쇠를 본다. 막아야 하면 까닭을 돌려주고, 통과면 None."""
    if DOC_FILES is None or not session:
        return None                       # 판단할 수 없으면 막지 않는다
    pid, doc = target_doc(r)
    if not doc:
        return None

    status = read_json("projects", pid, "_meta", "status.json") or {}
    rows = status.get("items") if isinstance(status, dict) else status
    state = next((x.get("state") for x in (rows or [])
                  if isinstance(x, dict) and x.get("doc") == doc), None)
    if state != GENERATING:
        return None                       # 쥔 사람이 없는 문서다

    holders = lock_holder(pid, doc)
    if not holders:
        return ("%s의 상태가 '%s'인데 _meta/runs.json에 진행 중인 실행이 없습니다.\n"
                "먼저 돌던 실행이 끊겼거나, 상태만 바꾸고 실행 기록을 남기지 않은 것입니다. "
                "둘 다 사람이 봐야 합니다.\n"
                "이어서 하려면 끊긴 실행을 runs.json에 '중단'으로 닫고(finished_at을 채움) "
                "새 실행을 session과 함께 남기십시오.\n대상 파일: %s" % (doc, state, r))

    if any(h.get("session") == session for h in holders):
        return None                       # 내 실행이다

    mine = [h.get("run_id") or "(run_id 없음)" for h in holders]
    owners = [h.get("session") or "(session 없음)" for h in holders]
    return ("%s는 지금 다른 실행이 만들고 있습니다. 상태가 '%s'입니다.\n"
            "쥐고 있는 실행: %s\n"
            "그 세션: %s\n"
            "이 세션: %s\n"
            "같은 단계를 두 번 돌리면 산출물이 서로 덮입니다. 그 실행이 끝나기를 기다리거나, "
            "끊긴 실행이면 runs.json에 '중단'으로 닫고 다시 시작하십시오."
            % (doc, state, ", ".join(mine), ", ".join(owners), session))


def main():
    try:
        payload = json.load(sys.stdin)
    except ValueError:
        sys.exit(0)                      # 읽을 수 없으면 간섭하지 않는다

    tool = payload.get("tool_name", "")
    if tool not in ("Write", "Edit", "MultiEdit"):
        sys.exit(0)
    ti = payload.get("tool_input") or {}
    path = ti.get("file_path") or ""
    if not path:
        sys.exit(0)
    r = rel(path)

    # 1. reference/는 고치지 않는다
    if r.startswith("reference/"):
        deny("reference/ 아래는 프로토타입과 목업 데이터라 고치지 않습니다.\n"
             "맞는 블록이 없으면 프로젝트 블록으로 만들고 등록 요청(BRQ-0000)을 남기십시오. (POL-024)\n"
             "대상: %s" % r)

    # 5. 남의 실행이 쥔 문서에 쓰기. Markdown과 JSON 모두에 건다
    why = check_lock(r, payload.get("session_id"))
    if why:
        deny(why)

    # 아래 검사는 프로젝트 데이터에만 건다
    if not (r.startswith("projects/") and r.endswith(".json")):
        sys.exit(0)

    after = new_content(tool, ti, path)
    if after is None:
        sys.exit(0)                      # 결과를 알 수 없으면 막지 않는다

    # 2. 상태를 승인으로 바꾸기
    #
    # 쓰기 전에 없던 '승인'이 생길 때만 막는다. 결과만 보고 막으면 사람이 한 번 승인한
    # 뒤로 총괄이 status.json에 아무것도 쓸 수 없다. 다음 단계를 '생성 중'으로 바꾸는
    # 것까지 막혀 파이프라인이 그 자리에서 선다. 2026-11-26에 실제로 그렇게 섰다.
    if r.endswith("_meta/status.json"):
        now = approved_set(after)
        if now is None:
            sys.exit(0)                  # 읽을 수 없으면 막지 않는다
        was = set()
        if os.path.exists(path):
            try:
                was = approved_set(open(path, encoding="utf8").read()) or set()
            except (IOError, UnicodeDecodeError):
                was = set()
        bad = sorted(str(b) for b in (now - was) if b)
        if bad:
            deny("문서 상태를 '승인'으로 바꿀 수 없습니다: %s\n"
                 "승인은 사람이 PR을 병합할 때만 일어납니다. 생성이 끝났으면 '검토 필요'로 두고 "
                 "PR을 여십시오. (POL-002)\n"
                 "이미 '승인'인 것을 그대로 둔 쓰기는 막지 않습니다." % ", ".join(bad))
        sys.exit(0)

    if not os.path.exists(path):
        sys.exit(0)                      # 새로 만드는 파일은 비교할 것이 없다
    try:
        before = items_of(open(path, encoding="utf8").read())
    except (IOError, UnicodeDecodeError):
        sys.exit(0)
    now = items_of(after)
    if before is None or now is None:
        sys.exit(0)

    # 3. 사람이 고친 항목 덮어쓰기
    touched = [i for i, old in before.items()
               if old.get("origin") == "human" and now.get(i) != old]
    if touched:
        deny("사람이 고친 항목은 덮어쓸 수 없습니다: %s\n"
             "origin이 human인 항목은 재생성 대상에서 빠집니다. 바꿔야 한다면 고치지 말고 "
             "사람에게 물으십시오. (POL-010)\n대상 파일: %s" % (", ".join(sorted(touched)), r))

    # 4. 항목 ID 지우기
    gone = sorted(set(before) - set(now))
    if gone:
        deny("항목 ID를 지울 수 없습니다: %s\n"
             "한 번 붙인 ID는 바꾸거나 재사용하지 않습니다. 없앨 항목은 지우지 말고 "
             "deprecated를 true로 두십시오. (POL-014)\n대상 파일: %s" % (", ".join(gone), r))

    sys.exit(0)


if __name__ == "__main__":
    main()
