#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""check_gate.py의 회귀 시험. 저장소 루트에서 실행한다: python3 scripts/test_gate.py

projects/_smoke에 합성 데이터를 만들어 6단계의 시작·완료 조건을 돌리고, 일부러 깨뜨린
다섯 경우가 실제로 걸리는지 본다. 끝나면 _smoke를 지운다. 종료 코드 0이면 통과다.
"""
import json, io, os, shutil, subprocess
P = "projects/_smoke"
def w(rel, o):
    p = os.path.join(P, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    io.open(p, "w", encoding="utf8").write(json.dumps(o, ensure_ascii=False, indent=2))
def md(rel, txt):
    p = os.path.join(P, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    io.open(p, "w", encoding="utf8").write(txt)
def pair(name, version="0.1.0"):
    """사람이 읽는 Markdown 짝을 만든다. 머리말의 version이 JSON과 같아야 한다."""
    md("%s" % name, "---\ndoc: X\ntitle: t\nversion: %s\nstatus: 검토 필요\n"
                    "owner: o\nupdated: 2026-11-26\nrefs: []\n---\n\n# t\n" % version)
def gate(stage, phase, wu=None, block=None):
    c = ["python3","scripts/check_gate.py","_smoke","--stage",stage,"--phase",phase]
    if wu: c += ["--work-unit", wu]
    if block: c += ["--block", block]
    r = subprocess.run(c, capture_output=True, text=True)
    return r.returncode, r.stdout.strip()
def step(label, stage, phase, wu=None, want=0, block=None):
    rc, out = gate(stage, phase, wu, block)
    mark = "OK " if rc == want else "!! "
    print("%s%-34s rc=%d (기대 %d)" % (mark, label, rc, want))
    if rc != want:
        print("\n".join("      " + l for l in out.split("\n")))
    return rc == want

shutil.rmtree(P, ignore_errors=True); os.makedirs(P)
C = {"origin":"ai","updated_at":"2026-11-26"}
STATES = ["REQ","POL","UF","WF","IA","QA"]
def status(**over):
    rows = [dict(doc=d, state=over.get(d,"대기"), approved_by=None, approved_at=None, pr=None) for d in STATES]
    rows.append(dict(doc="SB", state=over.get("SB","대기"), approved_by=None, approved_at=None,
                     pr=None, work_units=over.get("wu", [])))
    w("_meta/status.json", {"doc":"STATUS","version":"0.1.0","items":rows})

ok = True
print("--- 01 requirements ---")
w("project.json", {"doc":"PROJECT","version":"0.1.0","project_id":"_smoke","confirmed":False,
  "goals":[{"id":"GOAL-01","title":"g","description":"d"}],"scope_in":[],"scope_out":[],"users":[]})
status()
ok &= step("정의서 미확정 → 시작 막힘", "requirements", "start", want=1)
d = json.load(open(P+"/project.json", encoding="utf8")); d["confirmed"] = True
w("project.json", d)
ok &= step("정의서 확정 → 시작 가능", "requirements", "start")
w("requirements.json", {"doc":"REQ","version":"0.1.0","items":[
  dict(id="REQ-001",title="a",description="d",type="기능",group="g",user_type="u",
       priority="높음",acceptance=["3초 안에 응답한다"],refs=["GOAL-01"],**C)]})
pair("PRD.md")
ok &= step("완료 조건 통과", "requirements", "complete")

print("--- 02 policy ---")
status(REQ="검토 필요")
ok &= step("선행 생성됨 → 시작 가능", "policy", "start")
w("policies.json", {"doc":"POL","version":"0.1.0","items":[
  dict(id="POL-001",title="p",description="d",type="서비스",conditions="c",
       permissions=[],states=[],exceptions=["예외1"],refs=["REQ-001"],**C)]})
pair("POLICY.md")
ok &= step("완료 조건 통과", "policy", "complete")

print("--- 03 flow ---")
status(REQ="검토 필요", POL="검토 필요")
ok &= step("시작 가능", "flow", "start")
w("user-flow.json", {"doc":"UF","version":"0.1.0","items":[
  dict(id="UF-001",title="진입",description="d",step_type="진입",actor="u",
       next=[{"to":"UF-002","condition":"c","policy":None}],screen=None,refs=["REQ-001"],**C),
  dict(id="UF-002",title="분기",description="d",step_type="분기",actor="u",
       next=[{"to":"UF-003","condition":"c","policy":"POL-001"}],screen=None,refs=["POL-001"],**C),
  dict(id="UF-003",title="이탈",description="d",step_type="이탈",actor="u",
       next=[],screen=None,refs=[],**C)]})
w("workflow.json", {"doc":"WF","version":"0.1.0","items":[
  dict(id="WF-001",title="처리",description="d",step_type="처리",input=[],output=[],
       state_change=None,user_step="UF-001",refs=["UF-001"],**C),
  dict(id="WF-002",title="검증",description="d",step_type="검증",input=[],output=[],
       state_change=None,user_step="UF-002",refs=["UF-002"],**C)]})
pair("USER-FLOW.md"); pair("WORKFLOW.md")
ok &= step("완료 조건 통과", "flow", "complete")
# 일부러 깨기: 분기의 policy 제거
bad = json.load(open(P+"/user-flow.json", encoding="utf8"))
bad["items"][1]["next"][0]["policy"] = None
w("user-flow.json", bad)
ok &= step("분기에 정책 없음 → 미달 (QA-03)", "flow", "complete", want=1)
bad["items"][1]["next"][0]["policy"] = "POL-001"; w("user-flow.json", bad)

print("--- 04 ia ---")
status(REQ="검토 필요", POL="검토 필요", UF="검토 필요", WF="검토 필요")
ok &= step("시작 가능", "ia", "start")
uf = json.load(open(P+"/user-flow.json", encoding="utf8"))
uf["items"][0]["screen"] = "SCR-001"          # 진입만 화면 필수
w("user-flow.json", uf)
w("ia.json", {"doc":"IA","version":"0.1.0","items":[
  dict(id="SCR-001",title="s",description="d",menu="m",group="g",
       transitions=[],refs=["UF-001"],**C)],
  "work_units":[dict(id="WU-001",title="w",description="근거",screens=["SCR-001"],refs=["UF-001"],**C)]})
pair("IA.md")
ok &= step("완료 조건 통과", "ia", "complete")
# 일부러 깨기: 화면을 작업 단위에서 뺀다
bad = json.load(open(P+"/ia.json", encoding="utf8")); bad["work_units"][0]["screens"] = []
w("ia.json", bad)
ok &= step("화면이 작업 단위에 없음 → 미달 (POL-036)", "ia", "complete", want=1)
bad["work_units"][0]["screens"] = ["SCR-001"]; w("ia.json", bad)

print("--- 05 screen ---")
status(REQ="검토 필요",POL="검토 필요",UF="검토 필요",WF="검토 필요",IA="검토 필요")
ok &= step("IA 미승인 → 시작 막힘 (POL-037)", "screen", "start", "WU-001", want=1)
status(REQ="검토 필요",POL="검토 필요",UF="검토 필요",WF="검토 필요",IA="승인",
       wu=[{"id":"WU-001","state":"대기","approved_by":None,"approved_at":None,"pr":None}])
ok &= step("작업 단위 미선택 → 시작 막힘", "screen", "start", want=1)
ok &= step("IA 승인 + 작업 단위 선택 → 시작 가능", "screen", "start", "WU-001")
w("screens/SCR-001.json", {"id":"SCR-001","title":"s","refs":["UF-001"],
  "state":{"keyword":""},"areas":[{"id":"SCR-001-A01","title":"a",
  "block":{"id":"BLK-0001","version":"^1"},"props":{"title":"t"},
  "requirements":["REQ-001"],"policies":["POL-001"],"description":["d"],
  "interactions":[{"trigger":"입력","set":"keyword","result":"거른다"}],"exceptions":["예외1"]}]})
pair("STORYBOARD.md")
ok &= step("완료 조건 통과", "screen", "complete", "WU-001")
# 일부러 깨기: 없는 state를 가리키는 interaction
bad = json.load(open(P+"/screens/SCR-001.json", encoding="utf8"))
bad["areas"][0]["interactions"][0]["set"] = "없는키"
w("screens/SCR-001.json", bad)
ok &= step("interactions의 set이 state에 없음 → 미달", "screen", "complete", "WU-001", want=1)

print("--- 06 qa ---")
status(REQ="검토 필요",POL="검토 필요",UF="검토 필요",WF="검토 필요",IA="승인",SB="검토 필요",
       wu=[{"id":"WU-001","state":"검토 필요","approved_by":None,"approved_at":None,"pr":None}])
ok &= step("시작 가능", "qa", "start")
w("validation.json", {"doc":"QA","version":"0.1.0","items":[
  dict(id="QA-0%d"%n, rule="QA-0%d"%n, title="r", description="d", result="통과",
       targets=[], owner_agent=None, metric=(0.92 if n==1 else None), refs=[], **C)
  for n in range(1,8)]})
pair("QA-REPORT.md")
ok &= step("규칙 7개 판정 → 통과", "qa", "complete")
bad = json.load(open(P+"/validation.json", encoding="utf8")); bad["items"] = bad["items"][:5]
w("validation.json", bad)
ok &= step("규칙 2개 누락 → 미달", "qa", "complete", want=1)

print("--- Markdown 짝 검사 ---")
os.remove(P + "/PRD.md")
ok &= step("PRD.md 없음 → 미달", "requirements", "complete", want=1)
pair("PRD.md", version="9.9.9")
ok &= step("PRD.md의 version 불일치 → 미달", "requirements", "complete", want=1)
pair("PRD.md")
ok &= step("version 일치 → 통과", "requirements", "complete")


# ================================================================ 07~10 코드 단계
#
# 가짜 뷰어를 저장소 안에 만들고 UXIU_VIEWER로 가리킨다. 진짜 viewer/는 건드리지 않는다.
# package.json을 두지 않으므로 게이트가 빌드를 돌리지 않고 '참고'만 남긴다.

V = "_smoke_viewer"
os.environ["UXIU_VIEWER"] = os.path.abspath(V)
shutil.rmtree(V, ignore_errors=True)

def vw(rel, text):
    path = os.path.join(V, rel); os.makedirs(os.path.dirname(path), exist_ok=True)
    io.open(path, "w", encoding="utf8").write(text)

def vjson(rel, o):
    vw(rel, json.dumps(o, ensure_ascii=False, indent=2))

P0 = ["BRQ-0011","BLK-0001","BLK-0020","BLK-0003","BLK-0012",
      "BRQ-0012","BRQ-0008","BRQ-0013","BRQ-0010"]

def comp(name, props, phrases=()):
    """프롭 이름과 문구가 글자 그대로 든 가짜 컴포넌트."""
    body = "\n".join("  // %s" % x for x in props)
    msg = "\n".join("  // '%s'" % x for x in phrases)
    vw("src/blocks/%s/%s.tsx" % (name, name),
       "export function %s() {\n%s\n%s\n  return null\n}\n" % (name, body, msg))
    vw("src/blocks/%s/%s.module.css" % (name, name),
       ".root { color: var(--color-text-default); padding: var(--space-8); }\n")
    vw("src/blocks/%s/%s.test.tsx" % (name, name),
       "import { %s } from './%s'\ntest('t', () => { %s })\n" % (name, name, name))

def block_row(bid, name, props, areas, state="검토 필요"):
    return {"block_id": bid, "name": name, "version": "1.0.0", "range": "^1",
            "state": state, "component": name, "props": props, "areas": areas,
            "path": "%s/src/blocks/%s/%s.tsx" % (V, name, name)}

vw("src/tokens/tokens.css", ":root { --space-8: 8px; --color-text-default: #111; }\n")

print("--- 07 implement ---")
# 화면을 다시 쓴다. 영역 둘이 서로 다른 블록을 쓴다.
w("screens/SCR-001.json", {"id":"SCR-001","title":"s","refs":["UF-001"],
  "state":{"keyword":""},"areas":[
    {"id":"SCR-001-A01","title":"a","block":{"id":"BLK-0001","version":"^1"},
     "props":{"title":"t","showBack":"keyword"},"requirements":["REQ-001"],
     "policies":["POL-001"],"description":["d"],
     "interactions":[{"trigger":"입력","set":"keyword","result":"거른다"}],
     "exceptions":["읽지 못하면 '읽지 못했습니다'를 보인다"]},
    {"id":"SCR-001-A02","title":"b","block":{"id":"BLK-0012","version":"^1"},
     "props":{"title":"비어 있음"},"requirements":["REQ-001"],
     "policies":["POL-001"],"description":["d"],"interactions":[],"exceptions":[]}]})
status(REQ="검토 필요",POL="검토 필요",UF="검토 필요",WF="검토 필요",IA="승인",SB="검토 필요",
       wu=[{"id":"WU-001","state":"검토 필요","approved_by":None,"approved_at":None,"pr":None}])
ok &= step("화면설계서 미승인 → 시작 막힘", "implement", "start", block="BLK-0001", want=1)
status(REQ="승인",POL="승인",UF="승인",WF="승인",IA="승인",SB="승인",
       wu=[{"id":"WU-001","state":"승인","approved_by":"h","approved_at":"2026-11-27","pr":1}])
ok &= step("블록 미선택 → 시작 막힘", "implement", "start", want=1)
ok &= step("쓰이지 않는 블록 → 시작 막힘", "implement", "start", block="BLK-9999", want=1)
ok &= step("쓰는 블록 → 시작 가능", "implement", "start", block="BLK-0001")

ok &= step("blocks.json 없음 → 미달", "implement", "complete", block="BLK-0001", want=1)
comp("GlobalHeader", ["title","showBack"], ["읽지 못했습니다"])
comp("EmptyState", ["title"])
rows = [block_row("BLK-0001","GlobalHeader",["title","showBack"],["SCR-001-A01"]),
        block_row("BLK-0012","EmptyState",["title"],["SCR-001-A02"])]
vjson("blocks.json", {"doc":"UI","version":"0.1.0","items":rows})
ok &= step("완료 조건 통과", "implement", "complete", block="BLK-0001")

bad = [dict(r) for r in rows]; bad[0]["props"] = ["title"]
vjson("blocks.json", {"doc":"UI","version":"0.1.0","items":bad})
ok &= step("영역의 prop이 blocks.json에 없음 → 미달", "implement","complete",block="BLK-0001",want=1)

bad = [dict(r) for r in rows]; bad[0]["state"] = "승인"
vjson("blocks.json", {"doc":"UI","version":"0.1.0","items":bad})
ok &= step("블록 state를 '승인'으로 → 미달 (POL-002)","implement","complete",block="BLK-0001",want=1)

vjson("blocks.json", {"doc":"UI","version":"0.1.0","items":rows})
comp("GlobalHeader", ["title","showBack"])            # 예외 문구를 뺀다
ok &= step("예외 문구가 코드에 없음 → 미달", "implement","complete",block="BLK-0001",want=1)
comp("GlobalHeader", ["title","showBack"], ["읽지 못했습니다"])

vw("src/blocks/GlobalHeader/GlobalHeader.module.css", ".root { color: #ff0000; }\n")
ok &= step("색을 직접 적음 → 미달", "implement","complete",block="BLK-0001",want=1)
vw("src/blocks/GlobalHeader/GlobalHeader.module.css",
   ".root { color: var(--color-text-default); padding: 8px; }\n")
ok &= step("토큰이 있는 여백을 px로 적음 → 미달","implement","complete",block="BLK-0001",want=1)
vw("src/blocks/GlobalHeader/GlobalHeader.module.css",
   ".root { color: var(--color-text-default); padding: var(--space-8); }\n")

vw("src/blocks/GlobalHeader/GlobalHeader.tsx",
   "export function GlobalHeader() {\n  // title showBack '읽지 못했습니다'\n"
   "  fetch('/write')\n  return null\n}\n")
ok &= step("쓰는 호출이 있음 → 미달 (POL-034)","implement","complete",block="BLK-0001",want=1)
comp("GlobalHeader", ["title","showBack"], ["읽지 못했습니다"])

print("--- 08 render ---")
ok &= step("P0 블록이 다 서지 않음 → 시작 막힘", "render", "start", want=1)
for b in P0:
    if b not in ("BLK-0001","BLK-0012"):
        rows.append(block_row(b, "Fake%s" % b.replace("-",""), [], []))
vjson("blocks.json", {"doc":"UI","version":"0.1.0","items":rows})
ok &= step("P0 아홉이 모두 섬 → 시작 가능", "render", "start")

ok &= step("render.json 없음 → 미달", "render", "complete", want=1)
# 이동을 하나 둔다. 08의 완료 조건은 ia.json의 이동이 모두 걸렸는지 본다.
ia = json.load(open(P+"/ia.json", encoding="utf8"))
ia["items"][0]["transitions"] = [{"to":"SCR-002","trigger":"카드를 누른다"}]
w("ia.json", ia)
tr = [t for i in ia["items"] for t in i.get("transitions", [])]
assert tr, "시험용 이동이 비어 있으면 '이동이 걸리지 않음'을 볼 수 없다"
vjson("render.json", {"doc":"RND","version":"0.1.0","items":[
  {"screen_id":"SCR-001","areas_rendered":["SCR-001-A01","SCR-001-A02"],
   "areas_unrendered":[],"transitions_wired":tr}]})
ok &= step("완료 조건 통과", "render", "complete")
vjson("render.json", {"doc":"RND","version":"0.1.0","items":[
  {"screen_id":"SCR-001","areas_rendered":["SCR-001-A02","SCR-001-A01"],
   "areas_unrendered":[],"transitions_wired":tr}]})
ok &= step("영역 차례가 화면 파일과 다름 → 미달", "render", "complete", want=1)
vjson("render.json", {"doc":"RND","version":"0.1.0","items":[
  {"screen_id":"SCR-001","areas_rendered":["SCR-001-A01","SCR-001-A02"],
   "areas_unrendered":[],"transitions_wired":[]}]})
ok &= step("이동이 걸리지 않음 → 미달", "render", "complete", want=1)
vjson("render.json", {"doc":"RND","version":"0.1.0","items":[
  {"screen_id":"SCR-001","areas_rendered":["SCR-001-A01"],
   "areas_unrendered":[],"transitions_wired":tr}]})
ok &= step("못 그린 영역의 자리를 빼먹음 → 미달", "render", "complete", want=1)
vjson("render.json", {"doc":"RND","version":"0.1.0","items":[
  {"screen_id":"SCR-001","areas_rendered":["SCR-001-A01"],
   "areas_unrendered":["SCR-001-A02"],"transitions_wired":tr}]})
ok &= step("못 그린 영역도 자리를 지키면 통과", "render", "complete")

print("--- 09 impl-qa ---")
status(REQ="승인",POL="승인",UF="승인",WF="승인",IA="승인",SB="승인",QA="승인",
       wu=[{"id":"WU-001","state":"승인","approved_by":"h","approved_at":"2026-11-27","pr":1}])
ok &= step("선행 RND가 대기 → 시작 막힘", "impl-qa", "start", want=1)

def iq(n, result="통과", owner=None, targets=None):
    return dict(id="IQ-0%d"%n, rule="IQ-0%d"%n, title="r", description="d", result=result,
                targets=targets or [], owner_agent=owner,
                metric=(0.98 if n == 1 else None), refs=[], **C)
vjson("impl-validation.json", {"doc":"IQA","version":"0.1.0",
                               "items":[iq(n) for n in range(1,9)]})
vw("IMPL-QA-REPORT.md", "---\ndoc: IQA\ntitle: t\nversion: 0.1.0\nstatus: 검토 필요\n"
                        "owner: o\nupdated: 2026-11-27\nrefs: []\n---\n\n# t\n")
ok &= step("규칙 8개 판정 → 통과", "impl-qa", "complete")
vjson("impl-validation.json", {"doc":"IQA","version":"0.1.0",
                               "items":[iq(n) for n in range(1,7)]})
ok &= step("규칙 2개 누락 → 미달", "impl-qa", "complete", want=1)
vjson("impl-validation.json", {"doc":"IQA","version":"0.1.0",
      "items":[iq(1)] + [iq(n) for n in range(2,8)] + [iq(8, "실패", "qa", ["SCR-001-A01"])]})
ok &= step("실패인데 담당이 implement·render가 아님 → 미달","impl-qa","complete",want=1)

print("--- 10 review ---")
vjson("impl-validation.json", {"doc":"IQA","version":"0.1.0",
      "items":[iq(n) for n in range(1,8)] + [iq(8, "실패", "render", ["SCR-001-A01"])]})
ok &= step("IQ 하나가 실패 → 시작 막힘", "review", "start", want=1)
vjson("impl-validation.json", {"doc":"IQA","version":"0.1.0",
                               "items":[iq(n) for n in range(1,9)]})
ok &= step("여덟이 모두 통과 → 시작 가능", "review", "start")
walk = " ".join(t["trigger"] for t in tr)
vw("PROTOTYPE-REVIEW.md", "---\ndoc: PRV\ntitle: t\nversion: 0.1.0\nstatus: 검토 필요\n"
   "owner: o\nupdated: 2026-11-27\nverdict:\nrefs: []\n---\n\n# t\n\n%s\nSCR-001-A02\n" % walk)
ok &= step("걸어 볼 길이 차려짐 → 통과", "review", "complete")
vw("PROTOTYPE-REVIEW.md", "---\ndoc: PRV\ntitle: t\nversion: 0.1.0\nstatus: 검토 필요\n"
   "owner: o\nupdated: 2026-11-27\nverdict: 통과\nrefs: []\n---\n\n# t\n\n%s\nSCR-001-A02\n" % walk)
ok &= step("에이전트가 판정 칸을 채움 → 미달 (PV2 7절)", "review", "complete", want=1)

shutil.rmtree(P, ignore_errors=True)
shutil.rmtree(V, ignore_errors=True)
print("\n%s" % ("전체 통과: 게이트 10단계 + 실패 감지 21건이 모두 기대대로 동작합니다."
               if ok else "문제가 있습니다. 위의 !! 줄을 보십시오."))
raise SystemExit(0 if ok else 1)
