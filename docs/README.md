# 문서 지도

이 저장소의 기획 문서 목록입니다. 버전과 상태는 각 문서의 머리말과 같아야 하며, 검사 스크립트가 이를 확인합니다.

## 문서 목록

| 코드 | 문서 | 파일 | 버전 | 상태 | 선행 문서 | 항목 ID |
| --- | --- | --- | --- | --- | --- | --- |
| PRJ | 프로젝트 정의서 | [00-project-definition.md](00-project-definition.md) | 0.3.1 | 검토 필요 | 없음 | 없음 |
| REQ | 요구사항 정의서 | [01-requirements.md](01-requirements.md) | 0.3.0 | 검토 필요 | PRJ | REQ-000 |
| POL | 정책서 | [02-policy.md](02-policy.md) | 0.4.0 | 검토 필요 | PRJ, REQ | POL-000 |
| FSD | 기능 정의서 | [03-functional-spec.md](03-functional-spec.md) | 0.5.0 | 검토 필요 | PRJ, REQ, POL | FN-000, STU-00, QA-00 |
| UF | 유저 플로우 | [04-user-flow.md](04-user-flow.md) | 0.0.1 | 대기 | REQ, POL | UF-000 |
| WF | 워크 플로우 | [05-workflow.md](05-workflow.md) | 0.1.0 | 검토 필요 | REQ, POL | WF-000 |
| IA | 정보 구조도 | [06-information-architecture.md](06-information-architecture.md) | 0.0.2 | 대기 | UF, WF, FSD | STU-00 |
| SB | 화면설계서 | [07-screen-spec.md](07-screen-spec.md) | 0.0.0 | 대기 | IA, POL, FSD | 없음 |
| DATA | 데이터 규격 | [08-data-spec.md](08-data-spec.md) | 0.2.0 | 검토 필요 | POL, FSD | 없음 |
| AGT | 에이전트 명세 | [09-agent-spec.md](09-agent-spec.md) | 0.2.0 | 검토 필요 | POL, FSD, DATA | 없음 |
| RM | 프로젝트 로드맵 | [roadmap.md](roadmap.md) | 0.4.0 | 검토 필요 | PRJ, REQ, POL, FSD | 없음 |
| DEC | 결정 기록 | [decisions.md](decisions.md) | 0.4.0 | 검토 필요 | 없음 | 없음 |

상태의 뜻과 버전 규칙은 [CONTRIBUTING.md](../CONTRIBUTING.md)에 있습니다.

## 문서의 선후 관계

기획 문서의 표준 순서는 프로젝트 정의서 → 요구사항 정의서 → 정책서 → 유저 플로우·워크 플로우 → 정보 구조도 → 화면설계서입니다. 이 시스템이 다른 서비스의 기획 문서를 만들 때 따르는 순서와 같습니다.

```
PRJ 프로젝트 정의서
 └─ REQ 요구사항 정의서
     └─ POL 정책서
         ├─ FSD 기능 정의서 ──┬─ DATA 데이터 규격 ── AGT 에이전트 명세
         ├─ UF 유저 플로우 ───┤
         └─ WF 워크 플로우 ───┴─ IA 정보 구조도 ── SB 화면설계서
```

기능 정의서는 표준 순서에 없는 문서입니다. 요구사항과 정책을 이 시스템의 기능, 화면, 데이터, 실행 규칙으로 옮긴 것으로, 이 프로젝트에서는 요구사항 정의서와 정책서보다 먼저 쓰였습니다. 요구사항 정의서와 정책서는 그 내용에서 거꾸로 뽑아 정리한 초안이며, 세 문서가 서로 어긋나지 않는지는 검토 때 확인해야 합니다.

## 원본과 사본

| 문서 | 원본 (이 저장소) | 읽기용 사본 (Claude Docs) |
| --- | --- | --- |
| 프로젝트 정의서 | 00-project-definition.md | https://claude.ai/artifact/74kGv2JQQorgVCVdmRQqPY |
| 요구사항 정의서 | 01-requirements.md | https://claude.ai/artifact/PUReLF4mT7pW3UymGEaZyv |
| 정책서 | 02-policy.md | https://claude.ai/artifact/NqqkNGCzPCde6J1Ufd95rV |
| 기능 정의서 | 03-functional-spec.md | https://claude.ai/artifact/Ar9rassdmpEmcfPfA3WT7b |
| 프로젝트 로드맵 | roadmap.md | https://claude.ai/artifact/TPL4R6Q78L4EX4ED6zK1hd |

프로젝트 정의서와 기능 정의서는 Claude Docs에서 먼저 쓴 뒤 2026-11-25에 이 저장소로 옮겼습니다. 그 뒤로는 저장소가 원본입니다.

## 그 밖의 폴더

| 경로 | 내용 |
| --- | --- |
| `assets/` | 문서에 넣은 그림 |
| `data/` | 요구사항과 정책의 처리용 데이터. Markdown의 항목과 같아야 합니다. |
| `templates/` | 새 문서의 양식 |
