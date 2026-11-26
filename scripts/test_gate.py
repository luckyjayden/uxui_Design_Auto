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
def gate(stage, phase, wu=None):
    c = ["python3","scripts/check_gate.py","_smoke","--stage",stage,"--phase",phase]
    if wu: c += ["--work-unit", wu]
    r = subprocess.run(c, capture_output=True, text=True)
    return r.returncode, r.stdout.strip()
def step(label, stage, phase, wu=None, want=0):
    rc, out = gate(stage, phase, wu)
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

shutil.rmtree(P, ignore_errors=True)
print("\n%s" % ("전체 통과: 게이트 6단계 + 실패 감지 8건이 모두 기대대로 동작합니다."
               if ok else "문제가 있습니다. 위의 !! 줄을 보십시오."))
raise SystemExit(0 if ok else 1)
