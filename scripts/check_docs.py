#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""기획 문서 검사. 저장소 루트에서 실행한다: python3 scripts/check_docs.py

검사 항목은 CONTRIBUTING.md 9절과 같다. 문제가 있으면 목록을 출력하고 1로 끝난다.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, "docs")
STATUSES = {"대기", "생성 중", "검토 필요", "승인", "수정 필요"}
REQUIRED = ["doc", "title", "version", "status", "owner", "updated", "refs"]
errors = []


def err(msg):
    errors.append(msg)


def read(path):
    with open(path, encoding="utf8") as f:
        return f.read()


def front_matter(text):
    m = re.match(r"---\n(.*?)\n---\n", text, re.S)
    if not m:
        return None
    meta = {}
    for line in m.group(1).split("\n"):
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.split("#")[0].strip() if k.strip() != "mirror" else v.strip()
    return meta


# 1. 머리말
metas = {}
for name in sorted(os.listdir(DOCS)):
    if not name.endswith(".md") or name == "README.md":
        continue
    meta = front_matter(read(os.path.join(DOCS, name)))
    if meta is None:
        err(f"{name}: 머리말이 없습니다")
        continue
    for key in REQUIRED:
        if key not in meta:
            err(f"{name}: 머리말에 {key}가 없습니다")
    if meta.get("status") not in STATUSES:
        err(f"{name}: status '{meta.get('status')}'는 허용된 값이 아닙니다")
    if not re.fullmatch(r"\d+\.\d+\.\d+", meta.get("version", "")):
        err(f"{name}: version '{meta.get('version')}'이 MAJOR.MINOR.PATCH 형식이 아닙니다")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", meta.get("updated", "")):
        err(f"{name}: updated '{meta.get('updated')}'가 날짜 형식이 아닙니다")
    if meta.get("status") == "승인" and meta.get("version", "0").startswith("0."):
        err(f"{name}: 승인된 문서의 버전은 1.0.0 이상이어야 합니다")
    if "## 변경 이력" not in read(os.path.join(DOCS, name)):
        err(f"{name}: 변경 이력이 없습니다")
    metas[name] = meta

codes = {m.get("doc"): n for n, m in metas.items()}
if len(codes) != len(metas):
    err("문서 코드(doc)가 중복됩니다")
for name, meta in metas.items():
    refs = [r.strip() for r in meta.get("refs", "[]").strip("[]").split(",") if r.strip()]
    for r in refs:
        if r not in codes:
            err(f"{name}: refs의 '{r}'에 해당하는 문서가 없습니다")
        elif meta.get("status") == "승인" and metas[codes[r]].get("status") != "승인":
            err(f"{name}: 승인 상태인데 선행 문서 {r}가 승인되지 않았습니다")

# 2. 문서 지도
index = read(os.path.join(DOCS, "README.md"))
rows = {}
for line in index.split("\n"):
    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    if len(cells) >= 5 and re.search(r"\]\(([^)]+\.md)\)", cells[2] if len(cells) > 2 else ""):
        rows[re.search(r"\]\(([^)]+\.md)\)", cells[2]).group(1)] = cells
for name, meta in metas.items():
    if name == "templates":
        continue
    if name not in rows:
        err(f"문서 지도에 {name}이 없습니다")
        continue
    cells = rows[name]
    if cells[0] != meta.get("doc"):
        err(f"문서 지도: {name}의 코드가 머리말과 다릅니다")
    if cells[3] != meta.get("version"):
        err(f"문서 지도: {name}의 버전 {cells[3]}이 머리말 {meta.get('version')}과 다릅니다")
    if cells[4] != meta.get("status"):
        err(f"문서 지도: {name}의 상태 '{cells[4]}'가 머리말 '{meta.get('status')}'와 다릅니다")
for name in rows:
    if name not in metas:
        err(f"문서 지도의 {name} 파일이 없습니다")


# 3. 항목 ID와 참조
def defined_ids(name, prefix, digits):
    text = read(os.path.join(DOCS, name))
    ids = re.findall(rf"^\| ({prefix}-\d{{{digits}}}) \|", text, re.M)
    dup = {i for i in ids if ids.count(i) > 1}
    if dup:
        err(f"{name}: 중복된 ID {sorted(dup)}")
    return ids


req_ids = defined_ids("01-requirements.md", "REQ", 3)
pol_ids = defined_ids("02-policy.md", "POL", 3)
fsd = read(os.path.join(DOCS, "03-functional-spec.md"))
fn_ids = set(re.findall(r"^\| (FN-\d{3}) \|", fsd, re.M)) - {"FN-000"}  # FN-000은 표기 규칙의 예시

pol_text = read(os.path.join(DOCS, "02-policy.md"))
referenced_reqs = set()
for line in pol_text.split("\n"):
    m = re.match(r"\| (POL-\d{3}) \|", line)
    if not m:
        continue
    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    refs = re.findall(r"REQ-\d{3}", cells[3])
    if not refs:
        err(f"{m.group(1)}: 참조하는 요구사항이 없습니다")
    for r in refs:
        referenced_reqs.add(r)
        if r not in req_ids:
            err(f"{m.group(1)}: 없는 요구사항 {r}를 참조합니다")
for r in req_ids:
    if r not in referenced_reqs:
        err(f"{r}: 이 요구사항을 참조하는 정책이 없습니다")

# 4. Markdown과 JSON의 일치
for fname, ids, key in [("requirements.json", req_ids, "REQ"), ("policies.json", pol_ids, "POL")]:
    data = json.loads(read(os.path.join(DOCS, "data", fname)))
    jids = [i["id"] for i in data["items"]]
    if sorted(jids) != sorted(set(ids)):
        err(f"data/{fname}의 항목이 Markdown과 다릅니다: {sorted(set(jids) ^ set(ids))}")
    md_name = "01-requirements.md" if key == "REQ" else "02-policy.md"
    md = read(os.path.join(DOCS, md_name))
    if data.get("version") != metas[md_name].get("version"):
        err(f"data/{fname}의 version이 {md_name}의 머리말과 다릅니다")
    for item in data["items"]:
        for field in ["id", "title", "description", "refs", "origin", "updated_at"]:
            if field not in item:
                err(f"data/{fname} {item.get('id')}: 공통 필드 {field}가 없습니다")
        if f"**{item['title']}**" not in md:
            err(f"data/{fname} {item['id']}: 제목 '{item['title']}'이 {md_name}에 없습니다")
        if key == "POL":
            for r in item["refs"]:
                if r not in req_ids:
                    err(f"data/{fname} {item['id']}: 없는 요구사항 {r}를 참조합니다")
        if key == "REQ":
            for fn in item.get("functions", []):
                if fn not in fn_ids:
                    err(f"data/{fname} {item['id']}: 기능 정의서에 없는 기능 {fn}을 가리킵니다")

# 4-1. 플로우 항목. 유저 플로우와 워크 플로우가 항목을 정의하고,
# 정보 구조도와 화면설계서는 그 항목을 가리키기만 한다.
FLOW_DOCS = [("04-user-flow.md", "UF"), ("05-workflow.md", "WF")]
REF_DOCS = ["06-information-architecture.md", "07-screen-spec.md"]

flow_text = {}
flow_ids = {}
for name, prefix in FLOW_DOCS:
    text = read(os.path.join(DOCS, name))
    ids = re.findall(rf"^\| ({prefix}-\d{{3}}) \|", text, re.M)
    dup = {i for i in ids if ids.count(i) > 1}
    if dup:
        err(f"{name}: 중복된 ID {sorted(dup)}")
    flow_text[name] = text
    flow_ids[prefix] = set(ids)

for name in REF_DOCS:
    flow_text[name] = read(os.path.join(DOCS, name))

for name, text in flow_text.items():
    for kind, known in [("REQ", set(req_ids)), ("POL", set(pol_ids)), ("FN", fn_ids),
                        ("UF", flow_ids["UF"]), ("WF", flow_ids["WF"])]:
        for ref in sorted(set(re.findall(rf"{kind}-\d{{3}}", text))):
            if ref not in known and not ref.endswith("-000"):
                err(f"{name}: 없는 항목 {ref}를 참조합니다")

# 5. 상대 링크
# 우리가 쓴 Markdown만 본다. 내려받은 것과 빌드 결과는 우리가 고칠 것이 아니다.
SKIP_DIRS = {".git", "node_modules", "dist", "build", ".vite", "coverage"}
for base, dirs, files in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    if "uxui-registry-mock" in base and base.count(os.sep) > ROOT.count(os.sep) + 2:
        continue
    for f in files:
        if not f.endswith(".md"):
            continue
        path = os.path.join(base, f)
        if os.path.join("docs", "templates") in path:
            continue
        for target in re.findall(r"\]\(([^)#]+)(?:#[^)]*)?\)", read(path)):
            if re.match(r"[a-z]+://", target):
                continue
            if not os.path.exists(os.path.normpath(os.path.join(base, target))):
                err(f"{os.path.relpath(path, ROOT)}: 링크 대상 '{target}'이 없습니다")

if errors:
    print(f"문제 {len(errors)}건")
    for e in errors:
        print(" -", e)
    sys.exit(1)
print(f"통과: 문서 {len(metas)}개, 요구사항 {len(req_ids)}개, 정책 {len(pol_ids)}개, 기능 {len(fn_ids)}개")
