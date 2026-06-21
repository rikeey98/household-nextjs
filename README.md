# Household Next.js

Next.js, Vercel, Supabase 기반 가계부 재구축 프로젝트입니다.

## 개발

```bash
npm install
npm run dev
```

## 배포

Vercel production 배포 URL:

```txt
https://household-nextjs.vercel.app
```

Vercel project:

```txt
yonghyuns-projects-2c052357/household-nextjs
```

## 환경변수

`.env.example`을 기준으로 `.env.local`을 만듭니다.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

기존 Supabase anon key를 재사용하는 경우 `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 사용할 수 있습니다.

## Google OAuth 설정

로그인은 Supabase Auth의 Google OAuth를 사용합니다.

1. Google Cloud Console에서 OAuth Client를 만든다.
2. Authorized JavaScript origins에 아래 값을 추가한다.
   - `http://localhost:3000`
   - 운영 Vercel 도메인
3. Authorized redirect URIs에는 Supabase Google provider 화면에 표시되는 Supabase callback URL을 추가한다.
   - 예: `https://<project-ref>.supabase.co/auth/v1/callback`
4. Supabase Dashboard > Authentication > Providers > Google에서 Google Client ID와 Client Secret을 등록하고 활성화한다.
5. Supabase Dashboard > Authentication > URL Configuration의 Redirect URLs에 앱 callback URL을 추가한다.
   - `http://localhost:3000/auth/callback`
   - `https://household-nextjs.vercel.app/auth/callback`

## 전환 계획

전체 전환 계획은 `MIGRATION_PLAN.md`에 정리되어 있습니다.
