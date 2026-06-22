# 작업 로그 — 카드 엑셀 가져오기

- **작업 ID:** `03-card-import`
- **시작:** 2026-06-22
- **상태:** ✅ 완료
- **브랜치/커밋:** `main` / `pending`

## 목표 (완료 정의 · DoD)

삼성카드 국내 이용내역 엑셀을 `/import`에서 업로드해 미리보기, 중복 검사, 취소 행 제외, 일괄 저장까지 처리한다. 카드사별 파서 구조를 마련해 이후 카드사 포맷을 추가할 수 있게 한다.

## 작업 내역 (시간순)

- 2026-06-22 — 삼성카드 샘플 엑셀 구조 확인: `■ 국내이용내역` 시트, 31개 데이터 행, 승인일자/승인시각/가맹점명/승인금액/승인번호/취소여부/결제일 컬럼.
- 2026-06-22 — `exceljs` 의존성 추가.
- 2026-06-22 — 삼성카드 파서, import 서버 액션, 미리보기/저장 UI, 결제일/metadata DB 마이그레이션 추가.
- 2026-06-23 — 파일 input이 업로드 버튼처럼 보이지 않는 문제를 명확한 파일 선택 드롭존 UI로 수정.

## 변경 파일

| 파일 | 변경 |
|---|---|
| `features/import/*` | 카드 엑셀 파서, 중복 검사/저장 액션, `/import` UI 추가 |
| `app/(app)/import/page.tsx` | 실제 가져오기 화면 연결 |
| `db/schema.sql`, `db/migrations/002_import_payment_due_date_metadata.sql` | 결제일 및 원본 metadata 저장 컬럼 반영 |
| `docs/dev/TODO.md` | Phase 2 가져오기 진행 상태 갱신 |
| `package.json`, `package-lock.json` | `exceljs` 추가 |
| `features/import/import-manager.tsx` | 파일 선택 드롭존 UI 개선 |

## 결정 · 트레이드오프

- v1은 카드사별 파서 구조를 만들되 실제 검증 provider는 삼성카드 국내 이용내역만 지원한다.
- 거래일은 승인일자, 결제일은 `payment_due_date`에 별도 저장한다.
- 카테고리는 v1에서 미분류로 저장한다.
- 취소 표시 행은 저장 대상에서 제외한다.
- 카드번호 원문은 저장하지 않고 마지막 4자리만 metadata에 보관한다.

## 막힌 점 · 메모

- `npm install exceljs` 후 npm audit 기준 중간 수준 취약점 4개가 보고됨. `uuid` 하위 취약점은 override로 해소했고, Next 내부 `postcss@8.4.31` 취약점 2개가 남음.
- 현재 작업 전부터 untracked `AGENTS.md`가 있었으며 이번 작업에서는 수정하지 않는다.

## 다음 할 일

- Next 패키지에서 `postcss` 패치 버전을 포함한 릴리스가 나오면 의존성을 갱신한다.
