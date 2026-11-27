# -*- coding: utf-8 -*-
"""프로젝트 폴더를 읽는 공통 코드. check_gate.py와 훅이 함께 쓴다.

데이터 규격(docs/08-data-spec.md) 2절의 폴더 구조와 5절의 _meta 스키마를 따른다.
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROJECTS = os.path.join(ROOT, "projects")
# 시험이 가짜 뷰어를 가리킬 수 있게 둔다. 진짜 viewer/를 건드리지 않고 07~10을 돌려 본다.
VIEWER = os.environ.get("UXIU_VIEWER") or os.path.join(ROOT, "viewer")

STATES = ["대기", "생성 중", "검토 필요", "승인", "수정 필요"]
# 생성이 끝난 것으로 보는 상태. '수정 필요'는 승인 뒤 고칠 것이 생긴 상태라 파일은 있다.
GENERATED = {"검토 필요", "승인", "수정 필요"}

# 문서 코드 → (처리용 JSON, 사람이 읽는 Markdown)
DOC_FILES = {
    "REQ": ("requirements.json", "PRD.md"),
    "POL": ("policies.json", "POLICY.md"),
    "UF": ("user-flow.json", "USER-FLOW.md"),
    "WF": ("workflow.json", "WORKFLOW.md"),
    "IA": ("ia.json", "IA.md"),
    "SB": (None, "STORYBOARD.md"),      # 화면은 screens/ 아래에 여러 파일
    "QA": ("validation.json", "QA-REPORT.md"),
    # 07~10이 만드는 것 (파이프라인 v2). 코드와 그 상태 파일이라 viewer/ 아래에 둔다.
    "UI": ("blocks.json", None),        # 07. 항목 문서가 아니라 상태 파일이라 Markdown 짝이 없다
    "RND": ("render.json", None),       # 08. 같은 까닭
    "IQA": ("impl-validation.json", "IMPL-QA-REPORT.md"),
    "PRV": (None, "PROTOTYPE-REVIEW.md"),
}

# 문서 코드 → 파일이 놓이는 뿌리. 적히지 않으면 프로젝트 폴더다.
# 07~10은 코드를 만들고 코드는 projects/ 아래에 있지 않다. 파이프라인 v2 2절이 뷰어를
# 파일럿 프로젝트의 산출물로 보기로 정했으므로, 소속은 프로젝트이고 자리만 viewer/다.
DOC_ROOT = {"UI": VIEWER, "RND": VIEWER, "IQA": VIEWER, "PRV": VIEWER}

# 단계 → (이름, 만드는 문서 코드)
STAGES = {
    "requirements": ("01 Requirements", ["REQ"]),
    "policy": ("02 Policy", ["POL"]),
    "flow": ("03 Flow", ["UF", "WF"]),
    "ia": ("04 IA", ["IA"]),
    "screen": ("05 Screen", ["SB"]),
    "qa": ("06 QA", ["QA"]),
    "implement": ("07 UI Implementation", ["UI"]),
    "render": ("08 Wireframe Rendering", ["RND"]),
    "impl-qa": ("09 Implementation QA", ["IQA"]),
    "review": ("10 Prototype Review", ["PRV"]),
}
STAGE_ORDER = ["requirements", "policy", "flow", "ia", "screen", "qa",
               "implement", "render", "impl-qa", "review"]

ID_PATTERNS = {
    "REQ": r"REQ-\d{3}", "POL": r"POL-\d{3}", "UF": r"UF-\d{3}", "WF": r"WF-\d{3}",
    "SCR": r"SCR-\d{3}", "WU": r"WU-\d{3}", "GOAL": r"GOAL-\d{2}", "QA": r"QA-\d{2}",
    "IQ": r"IQ-\d{2}", "BLK": r"BLK-\d{4}", "BRQ": r"BRQ-\d{4}",
}
COMMON_FIELDS = ["id", "title", "description", "refs", "origin", "updated_at"]


class ProjectError(Exception):
    pass


class Project(object):
    def __init__(self, project_id):
        self.id = project_id
        self.path = os.path.join(PROJECTS, project_id)
        if not os.path.isdir(self.path):
            raise ProjectError("프로젝트 폴더가 없습니다: projects/%s" % project_id)

    def file(self, *parts):
        return os.path.join(self.path, *parts)

    def exists(self, *parts):
        return os.path.exists(self.file(*parts))

    def json(self, *parts):
        """JSON 파일을 읽는다. 없으면 None, 깨졌으면 ProjectError."""
        return read_json(self.file(*parts))

    # --- 문서 코드로 파일 찾기 (뿌리가 viewer/인 것도 함께 다룬다) ---

    def doc_path(self, doc, kind="json"):
        """문서 코드의 파일 경로. 그 꼴이 없는 문서면 None."""
        name = DOC_FILES[doc][0 if kind == "json" else 1]
        if name is None:
            return None
        root = DOC_ROOT.get(doc)
        return os.path.join(root, name) if root else self.file(name)

    def doc_json(self, doc):
        path = self.doc_path(doc)
        return read_json(path) if path else None

    def doc_items(self, doc):
        data = self.doc_json(doc)
        return (data or {}).get("items", []) or []

    def items(self, *parts):
        """items 배열을 꺼낸다. 파일이 없으면 빈 목록."""
        data = self.json(*parts)
        if data is None:
            return []
        if not isinstance(data, dict) or "items" not in data:
            raise ProjectError("%s에 items 배열이 없습니다" % os.path.join(*parts))
        return data["items"]

    # --- _meta ---

    def status(self):
        data = self.json("_meta", "status.json")
        if data is None:
            raise ProjectError("_meta/status.json이 없습니다")
        rows = data.get("items", data) if isinstance(data, dict) else data
        return {r["doc"]: r for r in rows}

    def state_of(self, doc):
        return self.status().get(doc, {}).get("state", "대기")

    def work_unit_states(self):
        """SB 줄의 work_units를 {WU-000: state}로 돌려준다."""
        sb = self.status().get("SB", {})
        return {w["id"]: w.get("state", "대기") for w in sb.get("work_units", [])}

    # --- 자주 쓰는 모음 ---

    def ids(self, doc):
        f = DOC_FILES[doc][0]
        return {i.get("id") for i in self.items(f) if i.get("id")}

    def work_units(self):
        ia = self.json("ia.json")
        return (ia or {}).get("work_units", [])

    def transitions(self):
        """ia.json의 이동을 (출발 화면, 도착 화면, 방아쇠)로 펼친다. 화면 항목 안에 들어 있다."""
        out = []
        for item in self.items("ia.json"):
            for t in item.get("transitions", []) or []:
                out.append((item.get("id"), t.get("to"), t.get("trigger")))
        return out

    def areas(self):
        """모든 화면 파일의 영역을 (화면 ID, 영역)으로 펼친다."""
        out = []
        for name in self.screen_files():
            data = self.json("screens", name) or {}
            for a in data.get("areas", []) or []:
                out.append((data.get("id") or name[:-5], a))
        return out

    def screen_files(self):
        d = self.file("screens")
        if not os.path.isdir(d):
            return []
        return sorted(f for f in os.listdir(d) if f.endswith(".json"))


def read_json(path):
    """JSON 파일을 읽는다. 없으면 None, 깨졌으면 ProjectError."""
    if not os.path.exists(path):
        return None
    try:
        with open(path, encoding="utf8") as f:
            return json.load(f)
    except ValueError as e:
        raise ProjectError("%s를 읽을 수 없습니다: %s" % (os.path.relpath(path, ROOT), e))


def list_projects():
    if not os.path.isdir(PROJECTS):
        return []
    return sorted(d for d in os.listdir(PROJECTS)
                  if os.path.isdir(os.path.join(PROJECTS, d)) and not d.startswith("."))


def front_matter(text):
    """Markdown 머리말을 사전으로 읽는다. 없으면 None."""
    m = re.match(r"---\n(.*?)\n---\n", text, re.S)
    if not m:
        return None
    meta = {}
    for line in m.group(1).split("\n"):
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip()
    return meta


def check_markdown_pair(p, doc, errors):
    """사람이 읽는 Markdown 짝이 있고 version이 JSON과 같은지 본다.

    에이전트는 JSON만 만들고 Markdown을 빠뜨리기 쉽다. 데이터 규격 3절은 둘을 짝으로 두고
    version이 같아야 한다고 정한다. 화면설계서(SB)는 JSON이 screens/ 아래에 여러 개라
    버전 비교 없이 STORYBOARD.md가 있는지만 본다.

    07·08이 만드는 blocks.json과 render.json은 ID가 붙는 항목 문서가 아니라 상태 파일이라
    (status.json·runs.json과 같은 자리) Markdown 짝을 두지 않는다. 그 둘은 그냥 지나간다.
    """
    json_name, md_name = DOC_FILES[doc]
    if md_name is None:
        return
    md_path = p.doc_path(doc, "md")
    if not os.path.exists(md_path):
        errors.append("%s가 없습니다. 사람이 읽는 Markdown도 함께 만들어야 합니다" % md_name)
        return
    meta = front_matter(open(md_path, encoding="utf8").read())
    if meta is None:
        errors.append("%s에 머리말이 없습니다" % md_name)
        return
    if json_name is None:
        return
    data = p.doc_json(doc) or {}
    if meta.get("version") != data.get("version"):
        errors.append("%s의 version '%s'이 %s의 '%s'과 다릅니다"
                      % (md_name, meta.get("version"), json_name, data.get("version")))


def check_common_fields(items, label, errors):
    """공통 필드 여섯 개(POL-015)가 있는지 본다."""
    seen = {}
    for item in items:
        iid = item.get("id", "(ID 없음)")
        for field in COMMON_FIELDS:
            if field not in item:
                errors.append("%s %s: 공통 필드 %s가 없습니다" % (label, iid, field))
        if item.get("origin") not in ("ai", "human"):
            errors.append("%s %s: origin이 ai 또는 human이 아닙니다" % (label, iid))
        if iid in seen:
            errors.append("%s: ID %s가 중복됩니다" % (label, iid))
        seen[iid] = True


def check_id_format(items, prefix, label, errors):
    pat = ID_PATTERNS[prefix]
    for item in items:
        iid = item.get("id", "")
        if not re.fullmatch(pat, iid or ""):
            errors.append("%s: ID '%s'가 %s 형식이 아닙니다" % (label, iid, prefix))
