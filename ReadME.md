# AI UX 설계 자동화 시스템

사람이 쓴 프로젝트 정의서를 입력으로, AI 에이전트가 요구사항 정의서부터 화면설계서까지 기획 문서를 차례로 만들고 검증하는 시스템의 저장소입니다. 지금은 기획 문서만 들어 있습니다.

## 어디에 무엇이 있는가

| 경로 | 내용 |
| --- | --- |
| [docs/README.md](docs/README.md) | 문서 지도. 문서 목록, 버전, 상태, 선후 관계 |
| [docs/roadmap.md](docs/roadmap.md) | 로드맵. 기획 문서 정리 → 프로토타입 → 개발 |
| [docs/decisions.md](docs/decisions.md) | 확정된 결정 기록 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 문서 형상관리 규칙 (버전, 상태, 브랜치, 승인) |
| [CHANGELOG.md](CHANGELOG.md) | 문서 변경 이력 |
| `docs/data/` | 요구사항과 정책의 처리용 데이터 (JSON) |
| `docs/templates/` | 새 문서의 양식 |
| `reference/uxui-registry-mock/` | UXUI 블록 레지스트리 프로토타입이 만드는 파일 묶음 (목업 데이터) |
| `reference/uxui-registry-prototype/` | UXUI 블록 레지스트리 프로토타입 V0.2의 원본 HTML |
| `scripts/check_docs.py` | 문서 검사 스크립트 |

## 문서를 고칠 때

1. 브랜치를 만들어 `docs/`의 Markdown을 고칩니다.
2. 머리말의 `version`과 `updated`, 문서 맨 아래의 변경 이력, `CHANGELOG.md`를 함께 고칩니다.
3. `python3 scripts/check_docs.py`를 실행해 통과하는지 봅니다.
4. PR을 올리고 검토를 받아 병합합니다.

자세한 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)에 있습니다.

## 지금 상태

로드맵의 1단계(기획 문서 정리)입니다. 프로젝트 정의서, 요구사항 정의서, 정책서, 기능 정의서가 검토 필요 상태이고, 승인된 문서는 아직 없습니다.
