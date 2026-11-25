# uxui-registry · AI 코딩 컨텍스트

이 저장소는 UXUI 블록(=패턴)의 단일 원천이다.
바이브 코딩으로 화면을 만들거나 고칠 때 아래 순서를 따른다.

1. 이름은 glossary/terms.json 의 표준 용어로 짓는다.
   avoid 목록에 있는 말(예: 팝업, 스낵바)은 쓰지 않는다.
2. 필요한 패턴을 blocks/core → blocks/standard 순서로 찾는다.
   있으면 slots 정의대로 조립하고, 화면에 block id와 version을 주석으로 남긴다.
3. 맞는 블록이 없으면 blocks/local 에 프로젝트 블록(0.x)으로 만들고
   requests/ 에 신규 등록 요청(type=new)을 남긴다. 표준 폴더에 직접 쓰지 않는다.
4. 블록을 고칠 때는 policy/version-approval.json 의 등급 판정을 따른다.
   슬롯 삭제는 항상 MAJOR 이다.
5. figma.node_id 가 디자인 원본이다. 원본과 다르게 구현하지 않는다.
6. 블록 파일의 세 영역을 구분해서 읽는다.
   - spec: 피그마에서 자동 추출한 구조(속성, 토큰, 레이아웃). 값은 토큰 이름으로 쓴다.
   - code: 실제 코드 컴포넌트와 import 경로. 있으면 새로 만들지 말고 import 한다.
   - guidance: 쓰는 상황과 쓰지 않을 때. 블록을 고를 때 가장 먼저 본다.
     pending_ai_draft 가 true 인 내용은 아직 확인 전이므로 무시한다.
7. spec.hardcoded 에 있는 값은 토큰으로 바꿔 구현하고 담당자에게 알린다.

## 현재 수록 (2026-11-05)
- Core 가이드 6개 · 표준 블록 15개 · 프로젝트 블록 4개
- 분류: 공통 모듈, UX 패턴, UI 패턴

## 폴더
- schema/   블록 파일 규격, 분류·태그 체계
- policy/   버전·승인, 승격, 역할, 요청 워크플로, 피그마 추출 규칙
- glossary/ 표준 용어 사전
- blocks/   core / standard / local, 블록 1개 = 파일 1개
- requests/ 등록·변경·승격 요청 기록
