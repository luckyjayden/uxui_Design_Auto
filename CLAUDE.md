# 이 저장소에서 작업하는 Claude 세션을 위한 안내

이 저장소는 AI UX 설계 자동화 시스템의 기획 문서 저장소다. 아직 코드는 없다.

## 먼저 읽을 것

1. `docs/README.md` 문서 지도
2. `CONTRIBUTING.md` 형상관리 규칙
3. `docs/decisions.md` 확정된 결정. 다른 문서와 내용이 다르면 결정 기록이 우선한다.

## 지켜야 할 것

- `docs/`의 Markdown이 원본이다. Claude Docs 문서는 사본이다.
- 문서를 고치면 머리말의 `version`과 `updated`, 문서 맨 아래의 변경 이력, `CHANGELOG.md`, `docs/README.md`의 문서 지도를 함께 고친다.
- `status`를 승인으로 바꾸지 않는다. 승인은 사람만 한다.
- 항목 ID(REQ, POL, FN, STU 등)를 바꾸거나 재사용하지 않는다.
- 요구사항이나 정책 항목을 고치면 `docs/data/`의 JSON도 같은 내용으로 고친다.
- 새로 정한 내용은 "제안"으로 표시한다. 사용자가 확정하지 않은 내용을 확정된 것처럼 쓰지 않는다.
- `main`에 직접 커밋하지 않고 브랜치와 PR로 올린다.
- 커밋 전에 `python3 scripts/check_docs.py`를 실행한다.

## 쓰지 않는 것

- API 과금 방식(Claude Agent SDK, Managed Agents, Messages API 직접 호출)은 선택지에서 제외했다.
- `reference/` 아래의 파일은 프로토타입과 그것이 만든 목업 데이터다. 고치지 않는다.
