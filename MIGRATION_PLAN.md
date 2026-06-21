# Household Next.js 전환 계획서

## 1. 목표

기존 `household-budget-supabase`의 Quasar/Vue 기반 가계부 앱을 새 Next.js 프로젝트로 재구축한다.

핵심 방향은 기존 프로젝트를 직접 변환하지 않고, 새 Next.js 앱을 만든 뒤 재사용 가능한 자산만 선별적으로 가져오는 것이다.

- 프론트엔드: Next.js App Router
- 배포: Vercel
- 백엔드: Supabase Auth, PostgreSQL, Row Level Security
- UI: Tailwind CSS, shadcn/ui 권장
- 데이터 검증: Zod 권장
- 폼: React Hook Form 권장
- 테이블: TanStack Table 권장

## 2. 현재 프로젝트에서 재사용할 것

### 재사용 대상

- Supabase SQL 스키마 초안
- RLS 정책 개념
- 거래 import 파서
- 중복 거래 감지 로직
- 카테고리 자동 매칭 로직
- 거래 fingerprint 생성 로직
- import row validation 로직
- merchant keyword 상수

예상 재사용 파일:

- `quasar-project/src/utils/parsers/cardParser.js`
- `quasar-project/src/utils/parsers/parserUtils.js`
- `quasar-project/src/utils/duplicateChecker.js`
- `quasar-project/src/utils/categoryMatcher.js`
- `quasar-project/src/utils/importFingerprint.js`
- `quasar-project/src/utils/validateImportRow.js`
- `quasar-project/src/constants/merchantKeywords.js`
- `supabase-schema.sql`
- `migration-add-transaction-columns.sql`

### 폐기 대상

- Quasar UI 컴포넌트
- Vue page/layout 컴포넌트
- Vue Router 설정
- Pinia store
- `services/api.js`의 Django/CSRF Axios API 코드
- `quasar.config.js`
- Vercel SPA 라우팅용 `vercel.json`

## 3. MVP 범위

처음부터 모든 기능을 옮기지 않고, 로그인 후 실제 가계부 사용에 필요한 흐름부터 구현한다.

1. 회원가입
2. 로그인
3. 로그아웃
4. 보호 라우트
5. 대시보드
6. 거래 내역 목록
7. 거래 추가
8. 거래 수정
9. 거래 삭제
10. 카테고리 목록
11. 카테고리 추가
12. 카테고리 수정
13. 카테고리 삭제
14. 카드 내역 파일 import
15. import 중복 감지
16. import 카테고리 자동 매칭

MVP 이후로 미룰 수 있는 기능:

- 자산 관리
- 예산 설정
- 알림 설정
- 실시간 구독
- 고급 통계
- 다중 통화 정산

## 4. 추천 프로젝트 구조

```txt
household-nextjs/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (app)/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── transactions/
│   │   │   └── page.tsx
│   │   ├── categories/
│   │   │   └── page.tsx
│   │   ├── import/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── layout/
│   └── ui/
├── features/
│   ├── auth/
│   ├── categories/
│   ├── transactions/
│   └── import/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── validations/
│   └── utils/
├── db/
│   ├── schema.sql
│   └── migrations/
├── middleware.ts
├── package.json
└── README.md
```

## 5. Supabase 설계

### 유지할 핵심 테이블

- `categories`
- `transactions`
- `assets`

### 추가 검토 테이블

import 기능을 안정화하려면 아래 테이블을 추가하는 편이 좋다.

- `import_files`
  - 업로드 파일 단위 추적
  - provider, file hash, row count, created_at 저장
- `merchant_category_rules`
  - 사용자가 수정한 카테고리 매칭을 학습
  - merchant keyword와 category_id 연결

### 우선 정리할 스키마 이슈

- 기존 `categories.parent_id`와 Vue 코드의 `parent` 필드 명칭 불일치 정리
- import 기능에서 쓰는 transaction 추가 컬럼 확정
- `import_fingerprint` unique 제약 조건 확정
- `amount`의 부호 정책 확정
- `occurred_at`과 `date`의 역할 구분

## 6. 인증 설계

Next.js에서는 Vue Router guard 대신 Supabase SSR client와 middleware를 사용한다.

구현 항목:

- 브라우저 Supabase client
- 서버 Supabase client
- middleware session refresh
- 로그인 action
- 회원가입 action
- 로그아웃 action
- 보호 라우트 redirect

환경변수:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

주의:

- Supabase service role key는 클라이언트에 절대 노출하지 않는다.
- 서버에서도 MVP 단계에서는 anon key + RLS 기반 접근을 우선 사용한다.

## 7. 화면 구현 순서

### Phase 1. 프로젝트 기반

1. Next.js 프로젝트 생성
2. TypeScript 설정
3. Tailwind CSS 설정
4. shadcn/ui 설정
5. Supabase client 설정
6. 기본 레이아웃 생성
7. Vercel 배포 확인

### Phase 2. 인증

1. Google OAuth 로그인 페이지
2. OAuth callback route
3. 로그아웃 버튼
4. 보호 라우트
5. 인증 상태에 따른 redirect

### Phase 3. 카테고리

1. 카테고리 목록 조회
2. 수입/지출 탭
3. 상위/하위 카테고리 트리
4. 카테고리 추가
5. 카테고리 수정
6. 카테고리 삭제

### Phase 4. 거래 내역

1. 거래 목록 조회
2. 날짜/타입/카테고리 필터
3. 거래 추가
4. 거래 수정
5. 거래 삭제
6. 월별 합계 표시

### Phase 5. 대시보드

1. 이번 달 수입
2. 이번 달 지출
3. 잔액
4. 카테고리별 지출
5. 최근 거래

### Phase 6. Import

1. 파일 업로드
2. 카드사 파서 포팅
3. 미리보기 테이블
4. validation 표시
5. fingerprint 생성
6. 기존 거래 중복 체크
7. 카테고리 자동 매칭
8. 선택 거래 저장
9. 저장 결과 요약

## 8. 데이터 접근 방식

권장 원칙:

- 페이지 초기 조회는 Server Component에서 처리한다.
- 버튼 클릭, 필터 변경, 폼 입력 등 인터랙션은 Client Component에서 처리한다.
- 생성/수정/삭제는 Server Action으로 시작한다.
- import 미리보기는 브라우저에서 처리하되, 최종 저장은 서버 경유를 우선 검토한다.
- RLS를 신뢰하되, 서버 action에서도 현재 사용자 확인을 수행한다.

예상 패턴:

```txt
app/(app)/transactions/page.tsx
  -> 서버에서 현재 user 확인
  -> Supabase로 transactions 조회
  -> TransactionsClient에 initial data 전달

features/transactions/actions.ts
  -> createTransaction
  -> updateTransaction
  -> deleteTransaction
```

## 9. 기존 기능 매핑

| 기존 Quasar 기능 | Next.js 위치 |
| --- | --- |
| `LoginPage.vue` | `app/(auth)/login/page.tsx` |
| `RegisterPage.vue` | `app/(auth)/register/page.tsx` |
| `MainLayout.vue` | `app/(app)/layout.tsx`, `components/layout/*` |
| `TransactionManager.vue` | `app/(app)/transactions/page.tsx`, `features/transactions/*` |
| `CategoryManager.vue` | `app/(app)/categories/page.tsx`, `features/categories/*` |
| `ImportTransactionsPage.vue` | `app/(app)/import/page.tsx`, `features/import/*` |
| `stores/auth.js` | Supabase SSR client, middleware, server actions |
| `services/supabase.js` | `lib/supabase/*`, feature별 query/action |
| `utils/parsers/*` | `features/import/parsers/*` |

## 10. 검증 계획

### 로컬 검증

- lint
- typecheck
- production build
- Supabase Auth login/logout
- RLS가 다른 사용자 데이터를 막는지 확인
- 거래 CRUD 수동 테스트
- 카테고리 CRUD 수동 테스트
- import 샘플 파일 테스트

### 권장 테스트

- parser unit test
- duplicate checker unit test
- category matcher unit test
- transaction server action test
- Playwright smoke test

## 11. 배포 계획

1. GitHub repository 준비
2. Vercel 프로젝트 생성
3. 환경변수 등록
4. Supabase Auth redirect URL 등록
5. Preview 배포 확인
6. Production 배포

Supabase Auth redirect URL 예시:

```txt
http://localhost:3000/**
https://household-nextjs.vercel.app/**
https://*.vercel.app/**
```

## 12. 예상 일정

### 빠른 MVP

- Day 1: 프로젝트 생성, Supabase 연결, 인증
- Day 2: 카테고리 CRUD, 거래 CRUD
- Day 3: 대시보드, 필터, 테이블 정리
- Day 4: import 로직 포팅
- Day 5: 배포, QA, UI polish

### 현실적인 안정화

- 1주차: MVP 기능 완성
- 2주차: import 안정화, 테스트, UI 개선, 배포 환경 정리

## 13. 주요 리스크

- 기존 DB 스키마와 현재 프론트 코드의 필드명이 일부 다르다.
- import 기능은 데이터 변형과 중복 판정이 많아 단순 화면보다 리스크가 크다.
- Supabase SSR 인증은 쿠키/middleware 설정을 정확히 해야 한다.
- RLS 정책을 잘못 구성하면 데이터가 안 보이거나, 반대로 노출될 수 있다.
- 기존 Quasar 화면을 그대로 옮길 수 없으므로 UI는 재작성 비용이 발생한다.

## 14. 의사결정 필요 항목

1. TypeScript를 기본으로 사용할지 여부
2. UI 라이브러리를 shadcn/ui로 확정할지 여부
3. 기존 Supabase 프로젝트를 그대로 쓸지, 새 Supabase 프로젝트를 만들지 여부
4. import 파일 이력을 DB에 저장할지 여부
5. 자산 관리 기능을 MVP에 포함할지 여부

## 15. 권장 결론

새 Next.js 프로젝트로 시작하는 것이 빠르다. 다만 모든 것을 버리는 방식이 아니라, 기존 프로젝트에서 검증된 Supabase 스키마와 import 관련 순수 로직을 가져오는 방식이 가장 효율적이다.

우선순위는 다음과 같다.

1. Supabase 스키마 확정
2. Next.js 인증 기반 구축
3. 거래/카테고리 CRUD 완성
4. import 로직 포팅
5. Vercel 배포 및 안정화
