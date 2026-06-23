# 검증 — 카드 엑셀 가져오기

- **작업 ID:** `03-card-import`
- **연관 worklog:** [`./worklog.md`](./worklog.md)
- **검증일:** 2026-06-23
- **결과:** ⚠️부분 통과

## 자동 검증

| 명령 | 결과 | 비고 |
|---|---|---|
| `npm run lint` | ✅ | ESLint 통과 |
| `npm run typecheck` | ✅ | 단독 실행 통과 |
| `npm run build` | ✅ | Next 빌드 통과, 기존 middleware deprecation warning 있음 |
| `npm audit` | ❌ | Next 내부 `postcss@8.4.31` moderate 취약점 2개 잔존. `npm audit fix --force`는 `next@9.3.3` 강제 설치를 제안해 적용하지 않음 |

## 기능 · 수동 검증

| # | 항목 | 방법 | 기대 | 결과 |
|---|---|---|---|---|
| 1 | 삼성카드 샘플 파싱 | 임시 컴파일된 파서로 샘플 파일 실행 | 미리보기 31행 표시 | ✅ 31행, 모두 ready |
| 2 | 취소 행 제외 | 샘플 `취소여부` 값 확인 | 취소 행은 제외 상태 | ✅ 샘플에는 취소 행 없음 |
| 3 | 날짜/결제일 정규화 | 첫 행 파싱 결과 확인 | 승인일/시각/결제일 ISO 변환 | ✅ `2025-12-31T18:25:36`, `2026-01-13` |
| 4 | `/import` 라우트 | `curl -I http://localhost:3000/import` | 보호 라우트가 로그인으로 리다이렉트 | ✅ `307 /login` |
| 5 | 파일 선택 UI | import 화면 코드 확인 및 빌드 | 명확한 `엑셀 파일 선택` 드롭존 표시 | ✅ |
| 6 | 신한카드 샘플 파싱 | HTML형 `.xls` 명세서를 임시 컴파일된 파서로 실행 | 16개 거래, 납부 합계 323,415원 | ✅ 16행 ready, 합계 323,415원 |
| 7 | 신한카드 해외 이용 금액 | CLAUDE/PlayStation 행 metadata 확인 | 원금+수수료 기준 저장 | ✅ 33,042원 / 31,653원 |
| 8 | HTML형 `.xls` 감지 보강 | `npm run lint && npm run typecheck && npm run build` | 다중 인코딩 후보 처리 후 빌드 통과 | ✅ |
| 9 | 신한카드 이용내역 조회 XLSX | `일시불+할부_카드이용내역조회.xlsx`를 임시 컴파일된 파서로 실행 | 신한 provider, 취소 행 제외 | ✅ 282행, 280행 ready, 2행 skipped |

## 발견된 이슈

- `npm audit`에서 Next 내부 `postcss` 취약점이 남아 있다. 현재 자동 수정은 Next major downgrade를 요구하므로 보류.

## 결론

가져오기 기능의 lint/typecheck/build 및 샘플 파서 검증은 통과했다. 보안 audit은 Next 의존성 이슈로 부분 통과 처리한다.
