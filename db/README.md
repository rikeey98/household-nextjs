# Database

기존 Supabase 프로젝트를 재사용하되, 실제 구현 전 아래 순서로 스키마를 확정한다.

1. 기존 `supabase-schema.sql` 검토
2. `migration-add-transaction-columns.sql`의 import 컬럼 병합
3. `categories.parent_id`와 기존 프론트 코드의 `parent` 필드 차이 정리
4. `transactions.import_fingerprint` unique 정책 확정
5. RLS 정책 재검증

